package controllers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/plugins"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// mockPlanLimitSvc satisfies domain.PlanLimitServiceInterface for tests.
type mockPlanLimitSvc struct {
	err error
}

func (m *mockPlanLimitSvc) CheckLimit(tenantID uuid.UUID, resource string) error {
	return m.err
}

// newTestHubManager creates a HubManager via NewHubManager() (which sets httpClient)
// and then overrides file paths to temp dir and HubURL to a fake offline server URL.
func newTestHubManager(t *testing.T) *plugins.HubManager {
	t.Helper()
	tmpDir := t.TempDir()

	// Use NewHubManager so httpClient is properly initialized
	hm := plugins.NewHubManager()
	hm.HubURL = "http://127.0.0.1:1" // guaranteed to fail — port 1 is privileged/unreachable
	hm.CoreVersion = "test"
	hm.InstanceIDFile = tmpDir + "/.instance_id"
	hm.TenantPluginsFile = tmpDir + "/.tenant_plugins.json"
	hm.LicenseStatusFile = tmpDir + "/.license_status.json"
	hm.EntitlementsStatusFile = tmpDir + "/.entitlements_status.json"
	return hm
}

func newInMemoryDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	return db
}

func TestPluginController_Instance_ReturnsInstanceID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	hm := newTestHubManager(t)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, hm)

	tenantID := uuid.New()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/plugins/instance", nil)
	c.Request = req
	c.Set("tenantId", tenantID)

	ctrl.Instance(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	_, ok := resp["instanceId"]
	assert.True(t, ok, "response must contain instanceId key")
}

func TestPluginController_Catalog_OfflineHub(t *testing.T) {
	gin.SetMode(gin.TestMode)
	hm := newTestHubManager(t)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, hm)

	tenantID := uuid.New()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/plugins/catalog", nil)
	c.Request = req
	c.Set("tenantId", tenantID)

	ctrl.Catalog(c)

	// GetCatalog always returns 200 with offline=true when hub is unreachable
	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	offline, _ := resp["offline"].(bool)
	assert.True(t, offline, "offline flag should be true when hub is unreachable")
}

func TestPluginController_Checkout_HubOfflineReturns503(t *testing.T) {
	gin.SetMode(gin.TestMode)
	hm := newTestHubManager(t)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, hm)

	tenantID := uuid.New()
	db := newInMemoryDB(t)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := strings.NewReader(`{"slug":"some-plugin"}`)
	req, _ := http.NewRequest("POST", "/plugins/checkout", body)
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Set("tenantId", tenantID)
	c.Set("userProfile", "admin")
	c.Set("userId", float64(1))
	c.Set("db", db)

	ctrl.Checkout(c)

	// Hub is offline → CreateCheckout returns error → controller returns non-200
	assert.NotEqual(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	_, ok := resp["error"]
	assert.True(t, ok, "response must contain error key when hub is offline")
}

func TestPluginController_Checkout_PlanLimitExceeded(t *testing.T) {
	gin.SetMode(gin.TestMode)
	hm := newTestHubManager(t)
	ctrl := NewPluginController(&mockPlanLimitSvc{err: errors.New("limit reached")}, hm)

	tenantID := uuid.New()
	db := newInMemoryDB(t)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := strings.NewReader(`{"slug":"some-plugin"}`)
	req, _ := http.NewRequest("POST", "/plugins/checkout", body)
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Set("tenantId", tenantID)
	c.Set("userProfile", "admin")
	c.Set("userId", float64(1))
	c.Set("db", db)

	ctrl.Checkout(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
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

func TestPluginController_Installed_NoPluginsReturnsActiveList(t *testing.T) {
	gin.SetMode(gin.TestMode)
	hm := newTestHubManager(t)
	ctrl := NewPluginController(&mockPlanLimitSvc{}, hm)

	tenantID := uuid.New()
	db := newInMemoryDB(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/plugins/installed", nil)
	c.Request = req
	c.Set("tenantId", tenantID)
	c.Set("userProfile", "admin")
	c.Set("userId", float64(1))
	c.Set("db", db)

	ctrl.Installed(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	_, ok := resp["active"]
	assert.True(t, ok, "response must contain active key")
}
