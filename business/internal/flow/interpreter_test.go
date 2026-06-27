package flow

import (
	"context"
	"encoding/json"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// syncRedis is a thread-safe SetNX/Del fake for the concurrency tests (H2). When
// serialize is true SetLock behaves like a real per-key lock (SetNX); when false
// it always grants the lock, isolating the optimistic-UPDATE guard from the lock.
type syncRedis struct {
	mu        sync.Mutex
	held      map[string]bool
	serialize bool
}

func newSyncRedis(serialize bool) *syncRedis {
	return &syncRedis{held: map[string]bool{}, serialize: serialize}
}

func (r *syncRedis) SetLock(key, _ string, _ time.Duration) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !r.serialize {
		return true, nil
	}
	if r.held[key] {
		return false, nil
	}
	r.held[key] = true
	return true, nil
}
func (r *syncRedis) DelLock(key string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.held, key)
	return nil
}
func (r *syncRedis) Subscribe(context.Context, string) *redis.PubSub    { return nil }
func (r *syncRedis) Publish(context.Context, string, interface{}) error { return nil }
func (r *syncRedis) Ping(context.Context) error                         { return nil }
func (r *syncRedis) Get(context.Context, string) (string, error)        { return "", nil }

func mustParseTime(t *testing.T, s string) time.Time {
	t.Helper()
	ts, err := time.Parse(time.RFC3339, s)
	require.NoError(t, err)
	return ts
}

// --- fake outbound adapter (records sends; no globals) ---

type captureAdapter struct {
	mu    sync.Mutex
	sends []OutboundMessage
}

func (a *captureAdapter) Channel() string { return "whatsapp" }
func (a *captureAdapter) Send(_ context.Context, msg OutboundMessage) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.sends = append(a.sends, msg)
	return nil
}
func (a *captureAdapter) bodies() []string {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([]string, len(a.sends))
	for i, s := range a.sends {
		out[i] = s.Body
	}
	return out
}

// newRuntime builds a Skeleton wired with a capturing adapter + a fake redis on
// a real test DB. Returns the skeleton and the adapter for assertions.
func newRuntime(t *testing.T) (*Skeleton, *captureAdapter, *gorm.DB) {
	t.Helper()
	db := testutil.NewTestDB(t)
	adapter := &captureAdapter{}
	reg := NewChannelRegistry()
	reg.Register(adapter)
	sk := NewSkeleton(db, reg, newFakeRedis())
	return sk, adapter, db
}

// dedupAdapter is a fake outbound that replicates the REAL WhatsAppAdapter's
// dedup-by-EnvID: a send whose EnvID was already seen is a silent no-op success.
// The naive captureAdapter ignores EnvID and so would NOT catch the menu-reprompt
// dedup leak (C2) — this one does, because a reprompt that reuses the first
// presentation's EnvID gets swallowed here exactly as it would in production.
type dedupAdapter struct {
	mu    sync.Mutex
	seen  map[string]bool
	sends []OutboundMessage // only the ones that actually "published"
}

func newDedupAdapter() *dedupAdapter {
	return &dedupAdapter{seen: map[string]bool{}}
}

func (a *dedupAdapter) Channel() string { return "whatsapp" }
func (a *dedupAdapter) Send(_ context.Context, msg OutboundMessage) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	if msg.EnvID != "" && a.seen[msg.EnvID] {
		return nil // dedup no-op, mirrors the held Redis lock
	}
	if msg.EnvID != "" {
		a.seen[msg.EnvID] = true
	}
	a.sends = append(a.sends, msg)
	return nil
}
func (a *dedupAdapter) bodies() []string {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([]string, len(a.sends))
	for i, s := range a.sends {
		out[i] = s.Body
	}
	return out
}

// newDedupRuntime is newRuntime but with the dedup-aware adapter.
func newDedupRuntime(t *testing.T) (*Skeleton, *dedupAdapter, *gorm.DB) {
	t.Helper()
	db := testutil.NewTestDB(t)
	adapter := newDedupAdapter()
	reg := NewChannelRegistry()
	reg.Register(adapter)
	sk := NewSkeleton(db, reg, newFakeRedis())
	return sk, adapter, db
}

// newRuntimeWithRedis builds a runtime with a caller-supplied redis fake (used by
// the H2 concurrency tests to toggle per-ticket-lock serialization).
func newRuntimeWithRedis(t *testing.T, red domain.RedisService) (*Skeleton, *dedupAdapter, *gorm.DB) {
	t.Helper()
	db := testutil.NewTestDB(t)
	adapter := newDedupAdapter()
	reg := NewChannelRegistry()
	reg.Register(adapter)
	sk := NewSkeleton(db, reg, red)
	return sk, adapter, db
}

// --- graph builders ---

func node(id, typ string, data map[string]any) Node {
	b, _ := json.Marshal(data)
	return Node{ID: id, Type: typ, Data: b}
}

func graphJSON(t *testing.T, nodes []Node, edges []Edge) (datatypesJSON, datatypesJSON) {
	t.Helper()
	nb, err := json.Marshal(nodes)
	require.NoError(t, err)
	eb, err := json.Marshal(edges)
	require.NoError(t, err)
	return nb, eb
}

type datatypesJSON = []byte

// seedActiveFlow inserts an active flow with the given graph and projected
// trigger value (keyword), returning the flow.
func seedActiveFlow(t *testing.T, db *gorm.DB, tenant uuid.UUID, keyword string, nodes []Node, edges []Edge) models.Flow {
	t.Helper()
	nb, eb := graphJSON(t, nodes, edges)
	f := models.Flow{
		Name:         "Test Flow",
		TriggerType:  TriggerWhatsAppMessage,
		TriggerValue: keyword,
		Nodes:        nb,
		Edges:        eb,
		Active:       true,
		TenantID:     tenant,
	}
	require.NoError(t, db.Select("Name", "TriggerType", "TriggerValue", "Nodes", "Edges", "Active", "TenantID").Create(&f).Error)
	return f
}

func inboundFor(tenant uuid.UUID, ticketID int, body, envID string) InboundContext {
	return InboundContext{
		TenantID: tenant,
		Body:     body,
		EnvID:    envID,
		Ticket:   &domain.Ticket{ID: ticketID, WhatsappID: 7, TenantID: tenant},
		Contact:  &domain.Contact{ID: 1, Name: "Alice", Number: "5511999", TenantID: tenant},
	}
}

// linear: start → message → menu(2 opts) → end. Menu branches by sourceHandle.
func menuBranchGraph() ([]Node, []Edge) {
	nodes := []Node{
		node("start", "start", map[string]any{"triggerType": "keyword"}),
		node("msg", "message", map[string]any{"contentType": "text", "content": "Oi {{contact_name}}"}),
		node("menu", "menu", map[string]any{
			"menuTitle": "Escolha:",
			"options":   []map[string]string{{"id": "opt1", "label": "Suporte"}, {"id": "opt2", "label": "Vendas"}},
		}),
		node("a", "message", map[string]any{"contentType": "text", "content": "Setor Suporte"}),
		node("b", "message", map[string]any{"contentType": "text", "content": "Setor Vendas"}),
		node("end", "end", map[string]any{"endAction": "none"}),
	}
	edges := []Edge{
		{ID: "e1", Source: "start", Target: "msg"},
		{ID: "e2", Source: "msg", Target: "menu"},
		{ID: "e3", Source: "menu", Target: "a", Handle: "option-opt1"},
		{ID: "e4", Source: "menu", Target: "b", Handle: "option-opt2"},
		{ID: "e5", Source: "a", Target: "end"},
		{ID: "e6", Source: "b", Target: "end"},
	}
	return nodes, edges
}

// ---------- tests ----------

func TestRuntime_TracerBullet_StartMenuBranchComplete(t *testing.T) {
	sk, adapter, db := newRuntime(t)
	tenant := uuid.New()
	nodes, edges := menuBranchGraph()
	seedActiveFlow(t, db, tenant, "menu", nodes, edges)

	// Inbound keyword starts the flow: sends greeting + menu, suspends at menu.
	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 10, "menu", "in-1"))

	bodies := adapter.bodies()
	require.Len(t, bodies, 2, "greeting + menu")
	assert.Equal(t, "Oi Alice", bodies[0])
	assert.Contains(t, bodies[1], "1. Suporte")
	assert.Contains(t, bodies[1], "2. Vendas")

	// Run is suspended waiting_message at the menu node.
	var run models.FlowRun
	require.NoError(t, db.Where(`"tenantId" = ? AND "ticketId" = ?`, tenant, 10).First(&run).Error)
	assert.Equal(t, models.FlowRunStatusWaitingMessage, run.Status)
	assert.Equal(t, "menu", run.CurrentNodeID)

	// Reply "2" branches to the Vendas message and completes.
	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 10, "2", "in-2"))

	bodies = adapter.bodies()
	require.Len(t, bodies, 3)
	assert.Equal(t, "Setor Vendas", bodies[2])

	require.NoError(t, db.Where(`"tenantId" = ? AND "ticketId" = ?`, tenant, 10).First(&run).Error)
	assert.Equal(t, models.FlowRunStatusCompleted, run.Status)
}

// TestRuntime_MenuReprompt_PublishesAgainAfterInvalidReply pins C2: an invalid
// reply must re-present the menu, and that reprompt must ACTUALLY publish — not
// be swallowed by the adapter dedup lock keyed by the first presentation's
// EnvID. Uses the dedup-aware adapter so the bug (constant per-node EnvID) is
// observable: with the bug, bodies stays at 2; with the fix, a 3rd send appears.
func TestRuntime_MenuReprompt_PublishesAgainAfterInvalidReply(t *testing.T) {
	sk, adapter, db := newDedupRuntime(t)
	tenant := uuid.New()
	nodes, edges := menuBranchGraph()
	seedActiveFlow(t, db, tenant, "menu", nodes, edges)

	// Start: greeting + menu presentation (2 sends), suspends at menu.
	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 12, "menu", "rp-1"))
	require.Len(t, adapter.bodies(), 2, "greeting + first menu")

	// Invalid reply "banana" → must re-present the menu (3rd send).
	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 12, "banana", "rp-2"))

	bodies := adapter.bodies()
	require.Len(t, bodies, 3, "reprompt must publish again (not be swallowed by dedup)")
	assert.Contains(t, bodies[2], "1. Suporte", "the 3rd send is the re-presented menu")

	// Still suspended at the menu, waiting for a valid reply.
	var run models.FlowRun
	require.NoError(t, db.Where(`"tenantId" = ? AND "ticketId" = ?`, tenant, 12).First(&run).Error)
	assert.Equal(t, models.FlowRunStatusWaitingMessage, run.Status)
	assert.Equal(t, "menu", run.CurrentNodeID)

	// A second invalid reply re-presents again (attempt counter keeps EnvID unique).
	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 12, "still wrong", "rp-3"))
	require.Len(t, adapter.bodies(), 4, "second reprompt must also publish")
}

func TestRuntime_MenuBranch_ByLabelChoosesA(t *testing.T) {
	sk, adapter, db := newRuntime(t)
	tenant := uuid.New()
	nodes, edges := menuBranchGraph()
	seedActiveFlow(t, db, tenant, "menu", nodes, edges)

	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 11, "menu", "a-1"))
	// Reply by label (case-insensitive) selects option A.
	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 11, "suporte", "a-2"))

	bodies := adapter.bodies()
	require.Len(t, bodies, 3)
	assert.Equal(t, "Setor Suporte", bodies[2])
}

// TestRuntime_Interpolation_StripsUnknownToken pins M1: a {{token}} with no
// matching var must render as "" (invariant: var ausente → vazio), not leak the
// literal placeholder to the contact. Also checks an editor-offered alias
// ({{firstName}}) IS seeded, not stripped.
func TestRuntime_Interpolation_StripsUnknownToken(t *testing.T) {
	sk, adapter, db := newRuntime(t)
	tenant := uuid.New()

	nodes := []Node{
		node("start", "start", map[string]any{"triggerType": "any"}),
		node("msg", "message", map[string]any{
			"contentType": "text",
			"content":     "Oi {{firstName}}![{{desconhecida}}]",
		}),
		node("end", "end", map[string]any{}),
	}
	edges := []Edge{
		{ID: "e1", Source: "start", Target: "msg"},
		{ID: "e2", Source: "msg", Target: "end"},
	}
	seedActiveFlow(t, db, tenant, "", nodes, edges)

	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 21, "ola", "m1-1"))

	bodies := adapter.bodies()
	require.Len(t, bodies, 1)
	// firstName seeded from contact "Alice"; unknown token stripped to "".
	assert.Equal(t, "Oi Alice![]", bodies[0])
}

// TestRuntime_Switch_DayOfWeekAndHour pins M2: the dayOfWeek/currentHour fields
// resolve to the real clock value (no longer a silent "" mismatch). The flow
// branches "a" when dayOfWeek equals today's weekday — which is always true.
func TestRuntime_Switch_DayOfWeekAndHour(t *testing.T) {
	sk, adapter, db := newRuntime(t)
	tenant := uuid.New()

	today := strconv.Itoa(int(time.Now().Weekday()))
	nodes := []Node{
		node("start", "start", map[string]any{"triggerType": "any"}),
		node("sw", "switch", map[string]any{
			"conditionsA": []map[string]any{
				{"field": "dayOfWeek", "operator": "equals", "value": today},
			},
		}),
		node("a", "message", map[string]any{"contentType": "text", "content": "weekday matched"}),
		node("b", "message", map[string]any{"contentType": "text", "content": "weekday miss"}),
		node("end", "end", map[string]any{}),
	}
	edges := []Edge{
		{ID: "e1", Source: "start", Target: "sw"},
		{ID: "e2", Source: "sw", Target: "a", Handle: "a"},
		{ID: "e3", Source: "sw", Target: "b", Handle: "b"},
		{ID: "e4", Source: "a", Target: "end"},
		{ID: "e5", Source: "b", Target: "end"},
	}
	seedActiveFlow(t, db, tenant, "", nodes, edges)

	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 22, "hi", "m2-1"))
	bodies := adapter.bodies()
	require.Len(t, bodies, 1)
	assert.Equal(t, "weekday matched", bodies[0], "dayOfWeek must resolve to the real weekday")

	// currentHour must resolve to a parseable hour (greaterThan -1 is always true).
	sk2, adapter2, db2 := newRuntime(t)
	nodes2 := []Node{
		node("start", "start", map[string]any{"triggerType": "any"}),
		node("sw", "switch", map[string]any{
			"conditionsA": []map[string]any{
				{"field": "currentHour", "operator": "greaterThan", "value": "-1"},
			},
		}),
		node("a", "message", map[string]any{"contentType": "text", "content": "hour resolved"}),
		node("b", "message", map[string]any{"contentType": "text", "content": "hour empty"}),
		node("end", "end", map[string]any{}),
	}
	seedActiveFlow(t, db2, tenant, "", nodes2, edges)
	sk2.RouteInboundTicket(context.Background(), inboundFor(tenant, 23, "hi", "m2-2"))
	b2 := adapter2.bodies()
	require.Len(t, b2, 1)
	assert.Equal(t, "hour resolved", b2[0], "currentHour must resolve numerically, not empty")
}

func TestRuntime_Switch_BranchesByCondition(t *testing.T) {
	sk, adapter, db := newRuntime(t)
	tenant := uuid.New()

	nodes := []Node{
		node("start", "start", map[string]any{"triggerType": "any"}),
		node("sw", "switch", map[string]any{
			"conditionsA": []map[string]any{{"field": "lastInput", "operator": "contains", "value": "vip"}},
		}),
		node("a", "message", map[string]any{"contentType": "text", "content": "VIP path"}),
		node("b", "message", map[string]any{"contentType": "text", "content": "Normal path"}),
		node("end", "end", map[string]any{}),
	}
	edges := []Edge{
		{ID: "e1", Source: "start", Target: "sw"},
		{ID: "e2", Source: "sw", Target: "a", Handle: "a"},
		{ID: "e3", Source: "sw", Target: "b", Handle: "b"},
		{ID: "e4", Source: "a", Target: "end"},
		{ID: "e5", Source: "b", Target: "end"},
	}
	seedActiveFlow(t, db, tenant, "", nodes, edges) // any-message trigger

	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 20, "I am a VIP customer", "sw-1"))
	bodies := adapter.bodies()
	require.Len(t, bodies, 1)
	assert.Equal(t, "VIP path", bodies[0])
}

func TestRuntime_DedupInboundDoesNotAdvanceTwice(t *testing.T) {
	sk, adapter, db := newRuntime(t)
	tenant := uuid.New()
	nodes, edges := menuBranchGraph()
	seedActiveFlow(t, db, tenant, "menu", nodes, edges)

	in := inboundFor(tenant, 30, "menu", "dup-env")
	sk.RouteInboundTicket(context.Background(), in)
	// Same EnvID redelivered: dedup must skip — no extra sends, still one run.
	sk.RouteInboundTicket(context.Background(), in)

	assert.Len(t, adapter.bodies(), 2, "redelivery must not re-send greeting+menu")

	var count int64
	db.Model(&models.FlowRun{}).Where(`"tenantId" = ? AND "ticketId" = ?`, tenant, 30).Count(&count)
	assert.Equal(t, int64(1), count, "redelivery must not start a second run")
}

// TestRuntime_ConcurrentResume_OnlyOneAdvances pins the H2 optimistic-UPDATE
// guard. With the per-ticket lock disabled (serialize=false), two concurrent
// deliveries of DISTINCT messages (different EnvIDs, so inbound-dedup doesn't
// mask one) both reach resume on the SAME waiting run. The conditional
// waiting_message→running claim must let exactly one win; the loser sees
// RowsAffected==0 and discards. Net effect: the branch message is sent once.
func TestRuntime_ConcurrentResume_OnlyOneAdvances(t *testing.T) {
	red := newSyncRedis(false) // lock disabled → isolate the optimistic UPDATE
	sk, adapter, db := newRuntimeWithRedis(t, red)
	tenant := uuid.New()
	nodes, edges := menuBranchGraph()
	seedActiveFlow(t, db, tenant, "menu", nodes, edges)

	// Start, suspending at the menu (greeting + menu published).
	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 13, "menu", "cr-start"))
	require.Len(t, adapter.bodies(), 2)

	// Two concurrent valid replies "2" (distinct EnvIDs) race the same run.
	var wg sync.WaitGroup
	for _, env := range []string{"cr-a", "cr-b"} {
		wg.Add(1)
		go func(e string) {
			defer wg.Done()
			sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 13, "2", e))
		}(env)
	}
	wg.Wait()

	// Exactly one resume advanced → exactly one "Setor Vendas" send (3 total).
	// (The adapter dedups by EnvID, so the send count alone is not enough — also
	// assert via the log trail that the run completed exactly once. A double
	// advance, which the optimistic claim prevents, would append two "complete"
	// rows even though the duplicate send is deduped.)
	bodies := adapter.bodies()
	assert.Len(t, bodies, 3, "concurrent resume must advance the run only once")

	var runs []models.FlowRun
	require.NoError(t, db.Where(`"tenantId" = ? AND "ticketId" = ?`, tenant, 13).Find(&runs).Error)
	require.Len(t, runs, 1)
	assert.Equal(t, models.FlowRunStatusCompleted, runs[0].Status)

	var completeLogs int64
	require.NoError(t, db.Model(&models.FlowRunLog{}).
		Where(`"tenantId" = ? AND "flowRunId" = ? AND action = ?`, tenant, runs[0].ID, "complete").
		Count(&completeLogs).Error)
	assert.Equal(t, int64(1), completeLogs, "run must complete exactly once (no double-advance)")
}

// TestSkeleton_ClaimRun_SecondClaimLoses pins the optimistic-UPDATE guard
// directly: two claims of the same waiting run — the first flips it to running
// (RowsAffected==1, wins), the second finds it no longer in waiting_message
// (RowsAffected==0, loses). This is the race breaker behind concurrent resumes.
func TestSkeleton_ClaimRun_SecondClaimLoses(t *testing.T) {
	db := testutil.NewTestDB(t)
	sk := NewSkeleton(db, NewChannelRegistry(), newFakeRedis())
	tenant := uuid.New()
	tid := 99

	run := models.FlowRun{
		ID: uuid.New(), TenantID: tenant, FlowID: 1, TicketID: &tid,
		Status: models.FlowRunStatusWaitingMessage, SubjectType: models.FlowRunSubjectTicket,
	}
	require.NoError(t, db.Session(&gorm.Session{NewDB: true}).Create(&run).Error)

	won1, err := sk.claimRun(context.Background(), run, models.FlowRunStatusWaitingMessage)
	require.NoError(t, err)
	assert.True(t, won1, "first claim must win")

	won2, err := sk.claimRun(context.Background(), run, models.FlowRunStatusWaitingMessage)
	require.NoError(t, err)
	assert.False(t, won2, "second claim must lose (run no longer waiting)")
}

// TestRuntime_ConcurrentStart_OneRun pins the H2 per-ticket lock: two concurrent
// trigger inbounds (distinct EnvIDs) for the same ticket with no active run must
// produce exactly ONE FlowRun, not two. The single-flight lock serializes the
// "no active run → StartFlow" section.
func TestRuntime_ConcurrentStart_OneRun(t *testing.T) {
	red := newSyncRedis(true) // per-ticket lock enabled
	sk, _, db := newRuntimeWithRedis(t, red)
	tenant := uuid.New()
	nodes, edges := menuBranchGraph()
	seedActiveFlow(t, db, tenant, "menu", nodes, edges)

	var wg sync.WaitGroup
	for _, env := range []string{"cs-a", "cs-b"} {
		wg.Add(1)
		go func(e string) {
			defer wg.Done()
			sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 14, "menu", e))
		}(env)
	}
	wg.Wait()

	var count int64
	db.Model(&models.FlowRun{}).Where(`"tenantId" = ? AND "ticketId" = ?`, tenant, 14).Count(&count)
	assert.Equal(t, int64(1), count, "concurrent starts must create exactly one FlowRun")
}

func TestRuntime_OptOutAbortsActiveRun(t *testing.T) {
	sk, _, db := newRuntime(t)
	tenant := uuid.New()
	nodes, edges := menuBranchGraph()
	seedActiveFlow(t, db, tenant, "menu", nodes, edges)

	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 40, "menu", "o-1"))
	// "PARAR" aborts the active run with precedence over branching.
	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 40, "PARAR", "o-2"))

	var run models.FlowRun
	require.NoError(t, db.Where(`"tenantId" = ? AND "ticketId" = ?`, tenant, 40).First(&run).Error)
	assert.Equal(t, models.FlowRunStatusAborted, run.Status)
}

func TestRuntime_SessionMandaIgnoresNewTrigger(t *testing.T) {
	sk, adapter, db := newRuntime(t)
	tenant := uuid.New()
	nodes, edges := menuBranchGraph()
	seedActiveFlow(t, db, tenant, "menu", nodes, edges)

	// Start, suspending at menu.
	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 50, "menu", "s-1"))
	require.Len(t, adapter.bodies(), 2)

	// A second "menu" (would re-trigger) is consumed as the menu reply instead of
	// starting a new run — sessão-manda. "menu" is not a valid option → reprompt.
	sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 50, "menu", "s-2"))

	var count int64
	db.Model(&models.FlowRun{}).Where(`"tenantId" = ? AND "ticketId" = ?`, tenant, 50).Count(&count)
	assert.Equal(t, int64(1), count, "active run must not be re-triggered")
}

func TestRuntime_CrossTenantIsolation(t *testing.T) {
	sk, adapter, db := newRuntime(t)
	tenantA := uuid.New()
	tenantB := uuid.New()
	nodes, edges := menuBranchGraph()
	seedActiveFlow(t, db, tenantA, "menu", nodes, edges)

	// Tenant B sends the same keyword — A's flow must NOT fire.
	sk.RouteInboundTicket(context.Background(), inboundFor(tenantB, 60, "menu", "x-1"))
	assert.Empty(t, adapter.bodies(), "tenant B inbound must not start tenant A's flow")

	var count int64
	db.Model(&models.FlowRun{}).Where(`"tenantId" = ?`, tenantB).Count(&count)
	assert.Equal(t, int64(0), count)
}

func TestRuntime_LoopGuardDoesNotHang(t *testing.T) {
	sk, _, db := newRuntime(t)
	tenant := uuid.New()

	// Cyclic graph: start → a → b → a → ... (no suspend/end).
	nodes := []Node{
		node("start", "start", map[string]any{"triggerType": "any"}),
		node("a", "message", map[string]any{"contentType": "text", "content": ""}),
		node("b", "message", map[string]any{"contentType": "text", "content": ""}),
	}
	edges := []Edge{
		{ID: "e1", Source: "start", Target: "a"},
		{ID: "e2", Source: "a", Target: "b"},
		{ID: "e3", Source: "b", Target: "a"}, // cycle
	}
	seedActiveFlow(t, db, tenant, "", nodes, edges)

	// Must terminate (loop guard), not hang. Run ends aborted.
	done := make(chan struct{})
	go func() {
		sk.RouteInboundTicket(context.Background(), inboundFor(tenant, 70, "go", "lg-1"))
		close(done)
	}()
	select {
	case <-done:
	case <-context.Background().Done():
	}

	var run models.FlowRun
	require.NoError(t, db.Where(`"tenantId" = ? AND "ticketId" = ?`, tenant, 70).First(&run).Error)
	assert.Equal(t, models.FlowRunStatusAborted, run.Status)
}

func TestRuntime_ExpireDueRuns(t *testing.T) {
	sk, _, db := newRuntime(t)
	tenant := uuid.New()

	// Insert a waiting run already expired.
	past := mustParseTime(t, "2000-01-01T00:00:00Z")
	tid := 80
	run := models.FlowRun{
		ID: uuid.New(), TenantID: tenant, FlowID: 1, TicketID: &tid,
		Status: models.FlowRunStatusWaitingMessage, SubjectType: models.FlowRunSubjectTicket,
		ExpiresAt: &past,
	}
	require.NoError(t, db.Session(&gorm.Session{NewDB: true}).Create(&run).Error)

	n, err := sk.ExpireDueRuns(context.Background())
	require.NoError(t, err)
	assert.GreaterOrEqual(t, n, int64(1))

	var got models.FlowRun
	require.NoError(t, db.Where(`id = ?`, run.ID).First(&got).Error)
	assert.Equal(t, models.FlowRunStatusExpired, got.Status)
}
