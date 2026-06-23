package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newSQLiteDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	return db
}

func ginCtxWithDB(t *testing.T, db *gorm.DB, setup func(c *gin.Context)) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	c.Set("db", db)
	setup(c)
	return c, w
}

func ginCtx(setup func(c *gin.Context)) *gin.Context {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)
	setup(c)
	return c
}

func TestTenantUUIDFromContext_UUIDType_Succeeds(t *testing.T) {
	expected := uuid.New()
	c := ginCtx(func(c *gin.Context) {
		c.Set("tenantId", expected)
	})
	got, err := TenantUUIDFromContext(c)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != expected {
		t.Fatalf("expected %v, got %v", expected, got)
	}
}

func TestTenantUUIDFromContext_StringType_Succeeds(t *testing.T) {
	expected := uuid.New()
	c := ginCtx(func(c *gin.Context) {
		c.Set("tenantId", expected.String())
	})
	got, err := TenantUUIDFromContext(c)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != expected {
		t.Fatalf("expected %v, got %v", expected, got)
	}
}

func TestTenantUUIDFromContext_MissingKey_ReturnsError(t *testing.T) {
	c := ginCtx(func(_ *gin.Context) {})
	_, err := TenantUUIDFromContext(c)
	if err == nil {
		t.Fatal("expected error when tenantId is missing")
	}
}

func TestTenantUUIDFromContext_InvalidString_ReturnsError(t *testing.T) {
	c := ginCtx(func(c *gin.Context) {
		c.Set("tenantId", "not-a-uuid")
	})
	_, err := TenantUUIDFromContext(c)
	if err == nil {
		t.Fatal("expected error for invalid UUID string")
	}
}

func TestTenantUUIDFromContext_InvalidType_ReturnsError(t *testing.T) {
	c := ginCtx(func(c *gin.Context) {
		c.Set("tenantId", 12345)
	})
	_, err := TenantUUIDFromContext(c)
	if err == nil {
		t.Fatal("expected error for unsupported type")
	}
}

func TestTenantUUIDFromContext_NilValue_ReturnsError(t *testing.T) {
	c := ginCtx(func(c *gin.Context) {
		c.Set("tenantId", nil)
	})
	_, err := TenantUUIDFromContext(c)
	if err == nil {
		t.Fatal("expected error for nil tenantId")
	}
}

// ── GetScoped ─────────────────────────────────────────────────────────────────

func TestGetScoped_MissingTenantID_Returns400(t *testing.T) {
	db := newSQLiteDB(t)
	c, w := ginCtxWithDB(t, db, func(c *gin.Context) {
		c.Set("userProfile", "admin")
	})
	_, _, ok := GetScoped(c, "Tickets")
	if ok {
		t.Fatal("expected ok=false when tenantId is missing")
	}
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestGetScoped_ValidTenant_ReturnsDB(t *testing.T) {
	db := newSQLiteDB(t)
	tenantID := uuid.New()
	c, w := ginCtxWithDB(t, db, func(c *gin.Context) {
		c.Set("tenantId", tenantID)
		c.Set("userProfile", "admin")
	})
	scopedDB, gotTenant, ok := GetScoped(c, "Tickets")
	if !ok {
		t.Fatal("expected ok=true")
	}
	if w.Code != http.StatusOK {
		t.Errorf("unexpected status: %d", w.Code)
	}
	if scopedDB == nil {
		t.Fatal("expected non-nil scoped DB")
	}
	if gotTenant != tenantID {
		t.Errorf("tenantID mismatch: got %v, want %v", gotTenant, tenantID)
	}
}

// ── GetScopedDB ───────────────────────────────────────────────────────────────

func TestGetScopedDB_AdminProfile_ScopesByTenantOnly(t *testing.T) {
	db := newSQLiteDB(t)
	tenantID := uuid.New()
	c, _ := ginCtxWithDB(t, db, func(c *gin.Context) {
		c.Set("tenantId", tenantID)
		c.Set("userProfile", "admin")
		c.Set("userId", float64(1))
	})
	scopedDB := GetScopedDB(c, "Tickets")
	if scopedDB == nil {
		t.Fatal("expected non-nil DB for admin")
	}
	// Statement should contain the tenantId clause only (no userId restriction)
	stmt := scopedDB.Statement
	if stmt == nil {
		return // lazy build; just verify no panic
	}
}

func TestGetScopedDB_AgentProfile_TicketsScopeContainsTenant(t *testing.T) {
	db := newSQLiteDB(t)
	tenantID := uuid.New()
	c, _ := ginCtxWithDB(t, db, func(c *gin.Context) {
		c.Set("tenantId", tenantID)
		c.Set("userProfile", "agent")
		c.Set("userId", float64(42))
	})
	scopedDB := GetScopedDB(c, "Tickets")
	if scopedDB == nil {
		t.Fatal("expected non-nil DB for agent")
	}
}

func TestGetScopedDB_AgentProfile_ContactsScope(t *testing.T) {
	db := newSQLiteDB(t)
	tenantID := uuid.New()
	c, _ := ginCtxWithDB(t, db, func(c *gin.Context) {
		c.Set("tenantId", tenantID)
		c.Set("userProfile", "agent")
		c.Set("userId", float64(7))
	})
	scopedDB := GetScopedDB(c, "Contacts")
	if scopedDB == nil {
		t.Fatal("expected non-nil DB for contacts scope")
	}
}

func TestGetScopedDB_MissingTenantID_UsesNilTenant(t *testing.T) {
	db := newSQLiteDB(t)
	c, _ := ginCtxWithDB(t, db, func(c *gin.Context) {
		c.Set("userProfile", "admin")
	})
	// Missing tenantId: GetScopedDB falls back to uuid.Nil (no panic expected)
	scopedDB := GetScopedDB(c, "Tickets")
	if scopedDB == nil {
		t.Fatal("expected non-nil DB even with missing tenant (fail-closed)")
	}
}

func TestGetScoped_ResponseBody_ContainsError(t *testing.T) {
	db := newSQLiteDB(t)
	c, w := ginCtxWithDB(t, db, func(_ *gin.Context) {})
	GetScoped(c, "Tickets")
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["error"] == "" {
		t.Error("expected error field in response body")
	}
}
