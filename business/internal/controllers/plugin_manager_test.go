package controllers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockPlanLimitSvc satisfies domain.PlanLimitServiceInterface for tests.
type mockPlanLimitSvc struct {
	err error
}

func (m *mockPlanLimitSvc) CheckLimit(tenantID uuid.UUID, resource string) error {
	return m.err
}

func TestPluginController_Instance_ReturnsInstanceID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewPluginController(&mockPlanLimitSvc{})

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

func TestPluginController_Catalog_Returns503(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewPluginController(&mockPlanLimitSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/plugins/catalog", nil)
	c.Request = req

	ctrl.Catalog(c)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	_, ok := resp["error"]
	assert.True(t, ok, "response must contain error key")
}

func TestPluginController_Checkout_Returns503(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewPluginController(&mockPlanLimitSvc{})

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

func TestPluginController_Checkout_PlanLimitExceeded(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewPluginController(&mockPlanLimitSvc{err: errors.New("limit reached")})

	tenantID := uuid.New()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	body := strings.NewReader(`{"slug":"some-plugin"}`)
	req, _ := http.NewRequest("POST", "/plugins/checkout", body)
	req.Header.Set("Content-Type", "application/json")
	c.Request = req
	c.Set("tenantId", tenantID)

	ctrl.Checkout(c)

	// Hub disabled → returns 503 regardless of plan limit
	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
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

func TestPluginController_Installed_ReturnsEmptyActive(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := NewPluginController(&mockPlanLimitSvc{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest("GET", "/plugins/installed", nil)
	c.Request = req

	ctrl.Installed(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	_, ok := resp["active"]
	assert.True(t, ok, "response must contain active key")
}
