package flow

import (
	"context"
	"log"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Skeleton is the single inbound trigger-match runtime stub for FASE 0. It is
// plugged into the inbound seam (EventListener.processMessage) and does exactly
// one thing: tenant-aware trigger matching against ACTIVE flows, then LOGS the
// match. It does NOT create a FlowRun, NOT execute a node, NOT send anything.
//
// This consolidates the two previously-dead workers (internal/flow/worker.go and
// services.RabbitMQService.StartFlowWorker) into one wired skeleton.
//
// Tenant isolation: RLS is INERT in this path (the app never sets
// app.current_tenant), so every query carries WHERE "tenantId" MANUALLY. The
// injected db is used read-only here; future writes (StartFlow) must use
// Session(NewDB:true).
type Skeleton struct {
	db       *gorm.DB
	registry *ChannelRegistry
}

// NewSkeleton builds the skeleton with an injected DB and the outbound channel
// registry (DI pura — no global). The registry is handed to the interpreter so
// node executors resolve adapters without touching globals.
func NewSkeleton(db *gorm.DB, registry *ChannelRegistry) *Skeleton {
	return &Skeleton{db: db, registry: registry}
}

// RouteInbound performs trigger matching for one inbound message and logs any
// matched flow. It is intentionally side-effect free beyond logging in FASE 0.
//
// fromMe messages are ignored (we never trigger on our own outbound). A nil db
// is tolerated (returns silently) so the inbound path never panics if the
// skeleton is unwired.
func (s *Skeleton) RouteInbound(ctx context.Context, tenantID uuid.UUID, body string, fromMe bool) {
	if fromMe || s == nil || s.db == nil {
		return
	}

	matches := s.matchTriggers(ctx, tenantID, body)
	for _, f := range matches {
		// NOTE: FASE 0 only routes+logs. Do NOT start a run here.
		// s.StartFlow(ctx, f, tenantID, body) // stub — wired in FASE 1.
		log.Printf("[FlowSkeleton] flow %d roteado para tenant %s (trigger=%q)", f.ID, tenantID, f.TriggerValue)
	}
}

// matchTriggers returns the ACTIVE flows of the given tenant whose trigger
// matches the inbound body. The query is tenant-scoped MANUALLY ("tenantId"),
// case-insensitive on the trigger value, and never crosses tenants.
//
// FASE 0 uses the legacy triggerType/triggerValue projection columns; the
// polymorphic trigger classes (ADR 0012) replace this in a later phase.
func (s *Skeleton) matchTriggers(ctx context.Context, tenantID uuid.UUID, body string) []models.Flow {
	normalized := strings.TrimSpace(strings.ToLower(body))

	var flows []models.Flow
	err := s.db.WithContext(ctx).
		Where(`"tenantId" = ? AND active = ? AND "triggerType" = ? AND lower("triggerValue") = ?`,
			tenantID, true, "whatsapp_message", normalized).
		Find(&flows).Error
	if err != nil {
		log.Printf("[FlowSkeleton] trigger match query failed for tenant %s: %v", tenantID, err)
		return nil
	}
	return flows
}

// StartFlow is a deliberate stub for FASE 0. It will, in FASE 1, snapshot the
// graph, create a FlowRun (Session(NewDB:true)) and enqueue execution. Kept
// commented to document the seam without activating execution.
//
// func (s *Skeleton) StartFlow(ctx context.Context, f models.Flow, tenantID uuid.UUID, body string) error {
// 	// snapshot graph → create models.FlowRun (status=running, expiresAt set) → enqueue
// 	return nil
// }
