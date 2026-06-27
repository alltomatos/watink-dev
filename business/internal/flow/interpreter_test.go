package flow

import (
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

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
