package flow

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// runTTL is how long a started run may stay alive before the expire sweep
// reaps it (orphan cleanup; a stalled waiting_message run is not eternal).
const runTTL = 24 * time.Hour

// optOutWords abort an active run unconditionally, with precedence over
// everything else (case-insensitive, exact match after trim).
var optOutWords = map[string]struct{}{
	"parar": {}, "stop": {}, "sair": {},
}

// Skeleton is the inbound runtime entrypoint. From FASE 1 it does real work:
// resume-first dispatch of an active run, opt-out abort, and trigger→StartFlow.
//
// Tenant isolation: RLS is INERT in this path (the app never sets
// app.current_tenant), so every query carries WHERE "tenantId" MANUALLY and
// writes use Session(NewDB:true).
type Skeleton struct {
	db          *gorm.DB
	registry    *ChannelRegistry
	redis       domain.RedisService
	interpreter *Interpreter
}

// NewSkeleton builds the skeleton with an injected DB, the outbound channel
// registry and Redis (DI pura — no global). It wires the interpreter with the
// default executor set so the inbound seam can drive node execution. Redis is
// used to dedup inbound redeliveries before advancing a run.
func NewSkeleton(db *gorm.DB, registry *ChannelRegistry, redis domain.RedisService) *Skeleton {
	var ip *Interpreter
	if db != nil {
		ip = NewInterpreter(DefaultExecutorRegistry(), registry, db)
	}
	return &Skeleton{db: db, registry: registry, redis: redis, interpreter: ip}
}

// InboundContext carries everything the runtime needs to resume/start a run for
// one inbound message. EnvID is the inbound message id (used for redelivery
// dedup); Ticket/Contact bind the run to the conversation.
type InboundContext struct {
	TenantID uuid.UUID
	Body     string
	FromMe   bool
	EnvID    string
	Ticket   *domain.Ticket
	Contact  *domain.Contact
}

// RouteInbound is the legacy (no-ticket) trigger-match + log path, preserved for
// the inbound seam when no ticket context is available. It never starts a run.
func (s *Skeleton) RouteInbound(ctx context.Context, tenantID uuid.UUID, body string, fromMe bool) {
	if fromMe || s == nil || s.db == nil {
		return
	}
	for _, f := range s.matchTriggers(ctx, tenantID, body) {
		log.Printf("[FlowSkeleton] flow %d roteado para tenant %s (trigger=%q)", f.ID, tenantID, f.TriggerValue)
	}
}

// RouteInboundTicket is the FASE 1 dispatcher. Precedence:
//  1. opt-out (PARAR/STOP/SAIR) → abort any active run, stop.
//  2. resume-first → an active waiting_message run for (tenant,ticket) resumes
//     with the body (session-manda: an active run ignores new triggers).
//  3. trigger-match → StartFlow on the first matching active flow.
//
// fromMe and a nil db/ticket are tolerated (no-op).
func (s *Skeleton) RouteInboundTicket(ctx context.Context, in InboundContext) {
	if s == nil || s.db == nil || in.FromMe || in.Ticket == nil {
		return
	}

	body := strings.TrimSpace(in.Body)

	// 1. Opt-out has precedence over everything (even a redelivery must abort).
	if _, ok := optOutWords[strings.ToLower(body)]; ok {
		if s.abortActiveRun(ctx, in.TenantID, in.Ticket.ID) {
			log.Printf("[FlowSkeleton] opt-out: aborted active run for tenant %s ticket %d", in.TenantID, in.Ticket.ID)
		}
		return
	}

	// FB1-W2: dedup the inbound by message id BEFORE advancing a run, so an AMQP
	// redelivery of the same message never advances the run twice. SetLock is
	// SetNX → false means we already processed this inbound.
	if s.redis != nil && in.EnvID != "" {
		acquired, err := s.redis.SetLock("wbot:flowin:"+in.EnvID, "1", runTTL)
		if err == nil && !acquired {
			return
		}
	}

	// 2. Resume-first: an active waiting run takes the inbound (session-manda).
	if run, ok := s.activeRun(ctx, in.TenantID, in.Ticket.ID); ok {
		s.resume(ctx, in, run)
		return
	}

	// 3. No active run → match triggers and start the first one.
	matches := s.matchTriggers(ctx, in.TenantID, in.Body)
	if len(matches) == 0 {
		return
	}
	if err := s.StartFlow(ctx, in, matches[0]); err != nil {
		log.Printf("[FlowSkeleton] StartFlow failed (tenant %s flow %d): %v", in.TenantID, matches[0].ID, err)
	}
}

// matchTriggers returns ACTIVE flows whose projected trigger matches the body.
// A keyword flow (non-empty triggerValue) matches case-insensitively exact; an
// "any message" flow (empty triggerValue with type whatsapp_message) matches any
// non-empty body. Tenant-scoped MANUALLY ("tenantId").
func (s *Skeleton) matchTriggers(ctx context.Context, tenantID uuid.UUID, body string) []models.Flow {
	normalized := strings.TrimSpace(strings.ToLower(body))

	var flows []models.Flow
	err := s.db.WithContext(ctx).
		Where(`"tenantId" = ? AND active = ? AND "triggerType" = ? AND (lower("triggerValue") = ? OR "triggerValue" = '')`,
			tenantID, true, TriggerWhatsAppMessage, normalized).
		Find(&flows).Error
	if err != nil {
		log.Printf("[FlowSkeleton] trigger match query failed for tenant %s: %v", tenantID, err)
		return nil
	}
	return flows
}

// activeRun returns the single active waiting_message run for (tenant,ticket).
func (s *Skeleton) activeRun(ctx context.Context, tenantID uuid.UUID, ticketID int) (models.FlowRun, bool) {
	var run models.FlowRun
	err := s.db.WithContext(ctx).
		Where(`"tenantId" = ? AND "ticketId" = ? AND status = ?`,
			tenantID, ticketID, models.FlowRunStatusWaitingMessage).
		Order(`"updatedAt" DESC`).
		First(&run).Error
	if err != nil {
		return models.FlowRun{}, false
	}
	return run, true
}

// abortActiveRun marks any non-terminal run for (tenant,ticket) as aborted.
// Returns true when at least one row was updated.
func (s *Skeleton) abortActiveRun(ctx context.Context, tenantID uuid.UUID, ticketID int) bool {
	res := s.db.Session(&gorm.Session{NewDB: true}).
		WithContext(ctx).
		Model(&models.FlowRun{}).
		Where(`"tenantId" = ? AND "ticketId" = ? AND status IN ?`,
			tenantID, ticketID, []string{
				models.FlowRunStatusRunning,
				models.FlowRunStatusWaitingMessage,
				models.FlowRunStatusWaitingUntil,
				models.FlowRunStatusWaitingEvent,
			}).
		Updates(map[string]interface{}{"status": models.FlowRunStatusAborted, "updatedAt": time.Now()})
	return res.Error == nil && res.RowsAffected > 0
}

// StartFlow snapshots the flow graph, creates a running FlowRun bound to the
// ticket and drives the interpreter. Writes in Session(NewDB) + WHERE tenantId.
func (s *Skeleton) StartFlow(ctx context.Context, in InboundContext, f models.Flow) error {
	graph, err := ParseGraph(f.Nodes, f.Edges)
	if err != nil {
		return err
	}
	snapshot, err := json.Marshal(graph)
	if err != nil {
		return err
	}

	now := time.Now()
	expires := now.Add(runTTL)
	ticketID := in.Ticket.ID

	run := models.FlowRun{
		ID:            uuid.New(),
		TenantID:      in.TenantID,
		FlowID:        f.ID,
		TicketID:      &ticketID,
		Status:        models.FlowRunStatusRunning,
		SubjectType:   models.FlowRunSubjectTicket,
		Vars:          mustJSON(buildVars(in)),
		ExpiresAt:     &expires,
		GraphSnapshot: snapshot,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := s.db.Session(&gorm.Session{NewDB: true}).WithContext(ctx).Create(&run).Error; err != nil {
		return err
	}

	st := &ExecState{
		TenantID: in.TenantID,
		Run:      &run,
		Graph:    graph,
		Vars:     buildVars(in),
		Inbound:  in.Body, // carry the triggering body for the first menu/switch
		Ticket:   in.Ticket,
		Contact:  in.Contact,
	}
	return s.interpreter.Run(ctx, st)
}

// resume rehydrates a suspended run from its GraphSnapshot and drives the
// interpreter with the new inbound body.
func (s *Skeleton) resume(ctx context.Context, in InboundContext, run models.FlowRun) {
	var graph FlowGraph
	if err := json.Unmarshal(run.GraphSnapshot, &graph); err != nil {
		log.Printf("[FlowSkeleton] resume: bad snapshot run=%s: %v", run.ID, err)
		return
	}

	vars := map[string]string{}
	if len(run.Vars) > 0 {
		_ = json.Unmarshal(run.Vars, &vars)
	}
	for k, v := range buildVars(in) {
		vars[k] = v // refresh contact/ticket-derived vars
	}

	st := &ExecState{
		TenantID: in.TenantID,
		Run:      &run,
		Graph:    graph,
		Vars:     vars,
		Inbound:  in.Body,
		Ticket:   in.Ticket,
		Contact:  in.Contact,
	}
	if err := s.interpreter.Run(ctx, st); err != nil {
		log.Printf("[FlowSkeleton] resume failed run=%s: %v", run.ID, err)
	}
}

// buildVars seeds the run variable map from the ticket/contact (the standard
// {{contact_name}}, {{ticket_id}}, etc.). Absent values are empty strings.
func buildVars(in InboundContext) map[string]string {
	vars := map[string]string{
		"contact_name": "",
		"ticket_id":    "",
		"last_input":   in.Body,
	}
	if in.Contact != nil {
		vars["contact_name"] = in.Contact.Name
		vars["contact_number"] = in.Contact.Number
	}
	if in.Ticket != nil {
		vars["ticket_id"] = strconv.Itoa(in.Ticket.ID)
	}
	return vars
}

// ExpireDueRuns sweeps runs whose ExpiresAt has passed and are still waiting,
// marking them expired. Tenant-agnostic batch (each row carries its tenantId);
// the WHERE filters by status+time only, never crossing into tenant data. This
// is a callable method — the real periodic scheduler is FASE 3.
func (s *Skeleton) ExpireDueRuns(ctx context.Context) (int64, error) {
	if s == nil || s.db == nil {
		return 0, nil
	}
	res := s.db.Session(&gorm.Session{NewDB: true}).
		WithContext(ctx).
		Model(&models.FlowRun{}).
		Where(`"expiresAt" IS NOT NULL AND "expiresAt" < ? AND status IN ?`,
			time.Now(), []string{
				models.FlowRunStatusRunning,
				models.FlowRunStatusWaitingMessage,
				models.FlowRunStatusWaitingUntil,
				models.FlowRunStatusWaitingEvent,
			}).
		Updates(map[string]interface{}{"status": models.FlowRunStatusExpired, "updatedAt": time.Now()})
	return res.RowsAffected, res.Error
}

// mustJSON marshals v to a JSON blob, falling back to "{}".
func mustJSON(v map[string]string) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("{}")
	}
	return b
}
