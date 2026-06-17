package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// mockPermRepo is a pure in-memory implementation of domain.PermissionRepository.
// No SQLite, no CGO — runs in any environment.
type mockPermRepo struct {
	perms []models.Permission
	err   error
}

func (m *mockPermRepo) FindAll(_ context.Context) ([]models.Permission, error) {
	return m.perms, m.err
}

func (m *mockPermRepo) FindByIDs(_ context.Context, ids []int) ([]models.Permission, error) {
	if m.err != nil {
		return nil, m.err
	}
	idSet := make(map[int]bool, len(ids))
	for _, id := range ids {
		idSet[id] = true
	}
	var result []models.Permission
	for _, p := range m.perms {
		if idSet[p.ID] {
			result = append(result, p)
		}
	}
	return result, nil
}

var _ domain.PermissionRepository = (*mockPermRepo)(nil)

// injectTenant simulates the IsAuth + TenantMiddleware context injection.
func injectTenant(c *gin.Context, tenantID uuid.UUID) {
	c.Set("tenantId", tenantID)
	c.Set("userProfile", "admin")
	c.Set("userId", float64(1))
}

// TestGroupController_ListPermissions_MockRepo verifica que ListPermissions retorna
// o catálogo global sem dependência de banco — mock puro de PermissionRepository.
func TestGroupController_ListPermissions_MockRepo(t *testing.T) {
	gin.SetMode(gin.TestMode)

	perms := []models.Permission{
		{ID: 1, Resource: "users", Action: "read"},
		{ID: 2, Resource: "tickets", Action: "write"},
		{ID: 3, Resource: "whatsapp", Action: "read"},
	}
	gc := NewGroupController(&mockPermRepo{perms: perms})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	injectTenant(c, uuid.New())
	c.Request, _ = http.NewRequest("GET", "/permissions", nil)

	gc.ListPermissions(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var got []models.Permission
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected 3 permissions, got %d", len(got))
	}
}

// TestGroupController_ListPermissions_RepoError verifica degradação graciosa quando
// o repositório retorna erro — deve responder 500, nunca panic.
func TestGroupController_ListPermissions_RepoError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	gc := NewGroupController(&mockPermRepo{err: &repoError{"db down"}})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	injectTenant(c, uuid.New())
	c.Request, _ = http.NewRequest("GET", "/permissions", nil)

	gc.ListPermissions(c)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

// TestGroupController_Create_NoTenantContext verifica que Create rejeita
// requests sem contexto de tenant (middleware ausente) — 400.
func TestGroupController_Create_NoTenantContext(t *testing.T) {
	gin.SetMode(gin.TestMode)

	gc := NewGroupController(&mockPermRepo{})

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	payload := map[string]string{"name": "Orphan"}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest("POST", "/groups", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	gc.Create(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// repoError é um erro sentinel para simular falhas de repositório nos testes.
type repoError struct{ msg string }

func (e *repoError) Error() string { return e.msg }
