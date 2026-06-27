package flow

import (
	"bytes"
	"context"
	"log"
	"strconv"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// captureLog redirects the standard logger to a buffer for the duration of fn,
// restoring the previous output afterwards. Kept local to this test file — no
// global mock state.
func captureLog(fn func()) string {
	var buf bytes.Buffer
	prevOut := log.Writer()
	prevFlags := log.Flags()
	log.SetOutput(&buf)
	log.SetFlags(0)
	defer func() {
		log.SetOutput(prevOut)
		log.SetFlags(prevFlags)
	}()
	fn()
	return buf.String()
}

// seedFlow inserts an active whatsapp_message flow for a tenant. .Select forces
// the zero-value boolean Active to persist.
func seedFlow(t *testing.T, db *gorm.DB, tenant uuid.UUID, name, trigger string, active bool) models.Flow {
	t.Helper()
	f := models.Flow{
		Name:         name,
		TriggerType:  "whatsapp_message",
		TriggerValue: trigger,
		Active:       active,
		TenantID:     tenant,
	}
	require.NoError(t, db.Select("Name", "TriggerType", "TriggerValue", "Active", "TenantID").Create(&f).Error)
	return f
}

// TestSkeleton_MatchesOwnTenantFlow — a matching active flow of the tenant is routed (logged).
func TestSkeleton_MatchesOwnTenantFlow(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenant := uuid.New()
	f := seedFlow(t, db, tenant, "Greeting", "ola", true)

	sk := NewSkeleton(db, nil)
	out := captureLog(func() {
		sk.RouteInbound(context.Background(), tenant, "Ola", false) // case-insensitive
	})

	assert.Contains(t, out, "roteado para tenant "+tenant.String())
	assert.Contains(t, out, "flow ")
	// matched flow id appears in the log line
	assert.Contains(t, out, strconv.Itoa(f.ID))
}

// TestSkeleton_NoMatchDoesNotRoute — a non-matching body routes nothing.
func TestSkeleton_NoMatchDoesNotRoute(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenant := uuid.New()
	seedFlow(t, db, tenant, "Greeting", "bom dia", true)

	sk := NewSkeleton(db, nil)
	out := captureLog(func() {
		sk.RouteInbound(context.Background(), tenant, "ola", false)
	})

	assert.NotContains(t, out, "roteado para tenant")
}

// TestSkeleton_InactiveFlowIgnored — inactive flows never route.
func TestSkeleton_InactiveFlowIgnored(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenant := uuid.New()
	seedFlow(t, db, tenant, "Inactive", "ola", false)

	sk := NewSkeleton(db, nil)
	out := captureLog(func() {
		sk.RouteInbound(context.Background(), tenant, "ola", false)
	})

	assert.NotContains(t, out, "roteado para tenant")
}

// TestSkeleton_FromMeSkipped — our own outbound never triggers a flow.
func TestSkeleton_FromMeSkipped(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenant := uuid.New()
	seedFlow(t, db, tenant, "Greeting", "ola", true)

	sk := NewSkeleton(db, nil)
	out := captureLog(func() {
		sk.RouteInbound(context.Background(), tenant, "ola", true) // fromMe
	})

	assert.NotContains(t, out, "roteado para tenant")
}

// TestSkeleton_CrossTenantIsolation — tenant B's inbound never matches tenant A's flow.
func TestSkeleton_CrossTenantIsolation(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()
	seedFlow(t, db, tenantA, "A Flow", "ola", true)

	sk := NewSkeleton(db, nil)
	out := captureLog(func() {
		sk.RouteInbound(context.Background(), tenantB, "ola", false)
	})

	// No route at all for B, and certainly not for A's tenant id.
	assert.NotContains(t, out, "roteado para tenant")
	assert.NotContains(t, out, tenantA.String())

	// Direct DB cross-check: tenant B sees zero matching flows.
	var count int64
	db.Model(&models.Flow{}).
		Where(`"tenantId" = ? AND active = ? AND "triggerType" = ? AND lower("triggerValue") = ?`,
			tenantB, true, "whatsapp_message", "ola").
		Count(&count)
	assert.Equal(t, int64(0), count, "tenant B must not see tenant A flows")
}

// TestSkeleton_NilDBTolerated — an unwired skeleton never panics.
func TestSkeleton_NilDBTolerated(t *testing.T) {
	sk := NewSkeleton(nil, nil)
	assert.NotPanics(t, func() {
		sk.RouteInbound(context.Background(), uuid.New(), "ola", false)
	})
}
