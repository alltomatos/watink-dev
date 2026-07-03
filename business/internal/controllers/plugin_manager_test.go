package controllers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/plugins"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// mockPlanLimitSvc satisfies domain.PlanLimitServiceInterface for tests.
type mockPlanLimitSvc struct {
	err error
}

func (m *mockPlanLimitSvc) CheckLimit(tenantID uuid.UUID, resource string) error {
	return m.err
}

// fakeLicenseFetcher is a local test double for plugins.LicenseFetcher — per
// project convention (CLAUDE.md "Mocks em structs locais dentro de cada
// Test... sem variável global de mock"), not a package-level mock.
type fakeLicenseFetcher struct {
	info map[string]plugins.LicenseInfo
	err  error
}

func (f *fakeLicenseFetcher) GetLicense(pluginSlug string) (plugins.LicenseInfo, error) {
	if f.err != nil {
		return plugins.LicenseInfo{}, f.err
	}
	info, ok := f.info[pluginSlug]
	if !ok {
		return plugins.LicenseInfo{}, errors.New("plugin not found")
	}
	return info, nil
}

// newTestContext builds a Gin test context with the given tenant/db already
// injected, matching what middleware.IsAuth + TenantMiddleware do in
// production (see auth.GetScoped / auth.GetDB).
func newTestPluginContext(method, path string, body *strings.Reader, db *gorm.DB, tenantID uuid.UUID) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	var req *http.Request
	if body != nil {
		req, _ = http.NewRequest(method, path, body)
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, path, nil)
	}
	c.Request = req
	c.Set("tenantId", tenantID)
	c.Set("db", db)
	return c, w
}

func TestPluginController_Instance_ReturnsInstanceID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/plugins/instance", nil)
	c.Request = req

	ctrl.Instance(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	_, ok := resp["instanceId"]
	assert.True(t, ok, "response must contain instanceId key")
}

func TestPluginController_Catalog_ReturnsStaticList(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/plugins/catalog", nil)
	c.Request = req

	ctrl.Catalog(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []staticCatalogEntry
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.Len(t, resp, 2)

	slugs := map[string]string{}
	for _, entry := range resp {
		slugs[entry.Slug] = entry.Type
	}
	assert.Equal(t, "pro", slugs["helpdesk"])
	assert.Equal(t, "pro", slugs["webchat"])
}

func TestPluginController_Checkout_Returns503(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, nil, nil, nil)

	tenantID := uuid.New()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := strings.NewReader(`{"slug":"some-plugin"}`)
	req, _ := http.NewRequest("POST", "/plugins/checkout", body)
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Set("tenantId", tenantID)

	ctrl.Checkout(c)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	_, ok := resp["error"]
	assert.True(t, ok, "response must contain error key")
}

func TestLegacyPluginStubs(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cases := []struct {
		name    string
		handler gin.HandlerFunc
	}{
		{"PluginsCatalog", PluginsCatalog},
		{"PluginsInstalled", PluginsInstalled},
		{"PluginsCheckout", PluginsCheckout},
		{"PluginsInstance", PluginsInstance},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			req, _ := http.NewRequest("GET", "/", nil)
			c.Request = req
			tc.handler(c)
			assert.Equal(t, http.StatusServiceUnavailable, w.Code)
		})
	}
}

func TestPluginController_Activate_LicensedGrantsAllocation(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	fetcher := &fakeLicenseFetcher{info: map[string]plugins.LicenseInfo{
		"helpdesk": {Status: "active", TenantCap: 0},
	}}
	registry := plugins.NewPluginRegistry(db, fetcher)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, db, registry, fetcher)

	c, w := newTestPluginContext("POST", "/plugins/helpdesk/activate", nil, db, tenantID)
	c.Params = gin.Params{{Key: "slug", Value: "helpdesk"}}

	ctrl.Activate(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var inst models.PluginInstallation
	require.NoError(t, db.Where(`"tenantId" = ? AND "pluginId" = ?`, tenantID, "helpdesk").First(&inst).Error)
	assert.True(t, inst.Active)
	require.NotNil(t, inst.ActivatedAt)
}

func TestPluginController_Activate_Unlicensed_Returns402(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	fetcher := &fakeLicenseFetcher{info: map[string]plugins.LicenseInfo{
		"helpdesk": {Status: "unlicensed"},
	}}
	registry := plugins.NewPluginRegistry(db, fetcher)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, db, registry, fetcher)

	c, w := newTestPluginContext("POST", "/plugins/helpdesk/activate", nil, db, tenantID)
	c.Params = gin.Params{{Key: "slug", Value: "helpdesk"}}

	ctrl.Activate(c)

	assert.Equal(t, http.StatusPaymentRequired, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "plugin_unlicensed", resp["error"])
	assert.Equal(t, "", resp["checkoutUrl"])

	var count int64
	db.Model(&models.PluginInstallation{}).Where(`"tenantId" = ? AND "pluginId" = ?`, tenantID, "helpdesk").Count(&count)
	assert.Equal(t, int64(0), count, "no allocation should be created without a valid license")
}

func TestPluginController_Activate_TenantCapReached_Returns402(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	// tenantA already occupies the single slot allowed by tenantCap=1.
	now := gin.H{}
	_ = now
	require.NoError(t, db.Exec(
		`INSERT INTO "PluginInstallations" ("id","tenantId","pluginId","active","createdAt","updatedAt") VALUES (gen_random_uuid(), ?, ?, true, now(), now())`,
		tenantA, "helpdesk",
	).Error)

	fetcher := &fakeLicenseFetcher{info: map[string]plugins.LicenseInfo{
		"helpdesk": {Status: "active", TenantCap: 1},
	}}
	registry := plugins.NewPluginRegistry(db, fetcher)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, db, registry, fetcher)

	c, w := newTestPluginContext("POST", "/plugins/helpdesk/activate", nil, db, tenantB)
	c.Params = gin.Params{{Key: "slug", Value: "helpdesk"}}

	ctrl.Activate(c)

	assert.Equal(t, http.StatusPaymentRequired, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "plugin_tenant_cap_reached", resp["error"])
}

func TestPluginController_Activate_Idempotent_ReactivatesWithoutDuplicating(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()

	// Seed an existing, inactive row for this tenant (e.g. previously
	// deactivated) — activating again must reuse the row, never violate the
	// UNIQUE(tenantId, pluginId) constraint.
	require.NoError(t, db.Exec(
		`INSERT INTO "PluginInstallations" ("id","tenantId","pluginId","active","createdAt","updatedAt") VALUES (gen_random_uuid(), ?, ?, false, now(), now())`,
		tenantID, "helpdesk",
	).Error)

	fetcher := &fakeLicenseFetcher{info: map[string]plugins.LicenseInfo{
		"helpdesk": {Status: "active", TenantCap: 1},
	}}
	registry := plugins.NewPluginRegistry(db, fetcher)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, db, registry, fetcher)

	c, w := newTestPluginContext("POST", "/plugins/helpdesk/activate", nil, db, tenantID)
	c.Params = gin.Params{{Key: "slug", Value: "helpdesk"}}

	ctrl.Activate(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var count int64
	require.NoError(t, db.Model(&models.PluginInstallation{}).
		Where(`"tenantId" = ? AND "pluginId" = ?`, tenantID, "helpdesk").
		Count(&count).Error)
	assert.Equal(t, int64(1), count, "reactivation must not duplicate the row")

	var inst models.PluginInstallation
	require.NoError(t, db.Where(`"tenantId" = ? AND "pluginId" = ?`, tenantID, "helpdesk").First(&inst).Error)
	assert.True(t, inst.Active)
}

func TestPluginController_Deactivate_MarksInactive(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(
		`INSERT INTO "PluginInstallations" ("id","tenantId","pluginId","active","createdAt","updatedAt") VALUES (gen_random_uuid(), ?, ?, true, now(), now())`,
		tenantID, "webchat",
	).Error)

	ctrl := NewPluginController(&mockPlanLimitSvc{}, db, nil, nil)

	c, w := newTestPluginContext("POST", "/plugins/webchat/deactivate", nil, db, tenantID)
	c.Params = gin.Params{{Key: "slug", Value: "webchat"}}

	ctrl.Deactivate(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var inst models.PluginInstallation
	require.NoError(t, db.Where(`"tenantId" = ? AND "pluginId" = ?`, tenantID, "webchat").First(&inst).Error)
	assert.False(t, inst.Active)
}

func TestPluginController_Installed_ReturnsAllocatedWithRealStatus(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(
		`INSERT INTO "PluginInstallations" ("id","tenantId","pluginId","active","createdAt","updatedAt") VALUES (gen_random_uuid(), ?, 'helpdesk', true, now(), now())`,
		tenantID,
	).Error)
	require.NoError(t, db.Exec(
		`INSERT INTO "PluginInstallations" ("id","tenantId","pluginId","active","createdAt","updatedAt") VALUES (gen_random_uuid(), ?, 'webchat', true, now(), now())`,
		tenantID,
	).Error)

	fetcher := &fakeLicenseFetcher{info: map[string]plugins.LicenseInfo{
		"helpdesk": {Status: "active"},
		"webchat":  {Status: "blocked"},
	}}
	registry := plugins.NewPluginRegistry(db, fetcher)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, db, registry, fetcher)

	c, w := newTestPluginContext("GET", "/plugins/installed", nil, db, tenantID)

	ctrl.Installed(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp struct {
		Active   []string          `json:"active"`
		Statuses map[string]string `json:"statuses"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.ElementsMatch(t, []string{"helpdesk", "webchat"}, resp.Active)
	assert.Equal(t, "active", resp.Statuses["helpdesk"])
	assert.Equal(t, "blocked", resp.Statuses["webchat"])
}
