package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// resetMaintenance resets the global maintenance state between tests.
func resetMaintenance() {
	mu.Lock()
	maintenanceMode = false
	maintenanceMsg = "Sistema em manutenção para atualização. Por favor, aguarde."
	mu.Unlock()
}

func TestGetMaintenanceStatus_Default(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetMaintenance()

	r := gin.New()
	r.GET("/maintenance", GetMaintenanceStatus)

	req := httptest.NewRequest(http.MethodGet, "/maintenance", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp["enabled"] != false {
		t.Fatalf("expected enabled=false, got %v", resp["enabled"])
	}
}

func TestSetMaintenanceMode_Enable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetMaintenance()
	defer resetMaintenance()

	SetMaintenanceMode(true, "Em manutenção agora")

	r := gin.New()
	r.GET("/maintenance", GetMaintenanceStatus)

	req := httptest.NewRequest(http.MethodGet, "/maintenance", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp["enabled"] != true {
		t.Fatalf("expected enabled=true, got %v", resp["enabled"])
	}
	if resp["message"] != "Em manutenção agora" {
		t.Fatalf("unexpected message: %v", resp["message"])
	}
}

func TestSetMaintenanceMode_EmptyMessageKeepsDefault(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetMaintenance()
	defer resetMaintenance()

	SetMaintenanceMode(true, "")

	r := gin.New()
	r.GET("/maintenance", GetMaintenanceStatus)

	req := httptest.NewRequest(http.MethodGet, "/maintenance", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["message"] != "Sistema em manutenção para atualização. Por favor, aguarde." {
		t.Fatalf("expected default message preserved, got: %v", resp["message"])
	}
}

func TestMaintenanceMiddleware_BlocksWhenActive(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetMaintenance()
	defer resetMaintenance()

	SetMaintenanceMode(true, "blocked")

	r := gin.New()
	r.Use(MaintenanceMiddleware())
	r.GET("/api/v1/contacts", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/contacts", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", w.Code)
	}
}

func TestMaintenanceMiddleware_AllowsHealthWhenActive(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetMaintenance()
	defer resetMaintenance()

	SetMaintenanceMode(true, "blocked")

	r := gin.New()
	r.Use(MaintenanceMiddleware())
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestMaintenanceMiddleware_AllowsMaintenanceRouteWhenActive(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetMaintenance()
	defer resetMaintenance()

	SetMaintenanceMode(true, "blocked")

	r := gin.New()
	r.Use(MaintenanceMiddleware())
	r.GET("/api/system/maintenance", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/system/maintenance", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for maintenance route, got %d", w.Code)
	}
}

func TestMaintenanceMiddleware_PassthroughWhenDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetMaintenance()

	r := gin.New()
	r.Use(MaintenanceMiddleware())
	r.GET("/api/v1/contacts", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/contacts", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 when maintenance disabled, got %d", w.Code)
	}
}
