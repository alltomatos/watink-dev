package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

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
