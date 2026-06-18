package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ── helpers ───────────────────────────────────────────────────────────────────

func setupGroupCRUDTestDB(t *testing.T) (*gorm.DB, uuid.UUID) {
	t.Helper()
	return testutil.NewTestDB(t), uuid.New()
}

func newGroupRouter(db *gorm.DB, tenantID string, permRepo *mockPermRepo) *gin.Engine {
	r := gin.New()
	r.Use(testScopedMiddleware(db, tenantID))
	ctrl := NewGroupController(permRepo)
	r.GET("/groups", ctrl.List)
	r.GET("/groups/:groupId", ctrl.Show)
	r.POST("/groups", ctrl.Create)
	r.PUT("/groups/:groupId", ctrl.Update)
	r.DELETE("/groups/:groupId", ctrl.Delete)
	r.GET("/permissions", ctrl.ListPermissions)
	return r
}

// ── tests ─────────────────────────────────────────────────────────────────────

func TestGroupController_List_ReturnsGroups(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupGroupCRUDTestDB(t)
	db.Exec(`INSERT INTO "Groups" (name, "tenantId") VALUES (?,?)`, "Admins", tenantID.String())

	tenantB := uuid.New()
	db.Exec(`INSERT INTO "Groups" (name, "tenantId") VALUES (?,?)`, "OtherTenant", tenantB.String())

	router := newGroupRouter(db, tenantID.String(), &mockPermRepo{})
	req := httptest.NewRequest(http.MethodGet, "/groups", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var groups []map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &groups); err != nil {
		t.Fatal(err)
	}
	if len(groups) != 1 {
		t.Fatalf("expected 1 group for tenant, got %d", len(groups))
	}
	if groups[0]["name"] != "Admins" {
		t.Fatalf("unexpected group name: %v", groups[0]["name"])
	}
}

func TestGroupController_Show_Found(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupGroupCRUDTestDB(t)
	db.Exec(`INSERT INTO "Groups" (name, "tenantId") VALUES (?,?)`, "Agents", tenantID.String())
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	router := newGroupRouter(db, tenantID.String(), &mockPermRepo{})
	req := httptest.NewRequest(http.MethodGet, "/groups/"+strconv.Itoa(id), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGroupController_Show_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupGroupCRUDTestDB(t)

	router := newGroupRouter(db, tenantID.String(), &mockPermRepo{})
	req := httptest.NewRequest(http.MethodGet, "/groups/9999", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGroupController_Create_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupGroupCRUDTestDB(t)

	payload, _ := json.Marshal(map[string]string{"name": "Supervisors"})
	router := newGroupRouter(db, tenantID.String(), &mockPermRepo{})
	req := httptest.NewRequest(http.MethodPost, "/groups", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp["name"] != "Supervisors" {
		t.Fatalf("unexpected name: %v", resp["name"])
	}
}

func TestGroupController_Create_MissingName(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupGroupCRUDTestDB(t)

	payload, _ := json.Marshal(map[string]string{})
	router := newGroupRouter(db, tenantID.String(), &mockPermRepo{})
	req := httptest.NewRequest(http.MethodPost, "/groups", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code == http.StatusOK {
		t.Fatal("expected non-200 for missing name, got 200")
	}
}

func TestGroupController_Update_Name(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupGroupCRUDTestDB(t)
	db.Exec(`INSERT INTO "Groups" (name, "tenantId") VALUES (?,?)`, "OldName", tenantID.String())
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	payload, _ := json.Marshal(map[string]interface{}{"name": "NewName"})
	router := newGroupRouter(db, tenantID.String(), &mockPermRepo{})
	req := httptest.NewRequest(http.MethodPut, "/groups/"+strconv.Itoa(id), bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGroupController_Delete_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupGroupCRUDTestDB(t)
	db.Exec(`INSERT INTO "Groups" (name, "tenantId") VALUES (?,?)`, "ToDelete", tenantID.String())
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	router := newGroupRouter(db, tenantID.String(), &mockPermRepo{})
	req := httptest.NewRequest(http.MethodDelete, "/groups/"+strconv.Itoa(id), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGroupController_Delete_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupGroupCRUDTestDB(t)

	router := newGroupRouter(db, tenantID.String(), &mockPermRepo{})
	req := httptest.NewRequest(http.MethodDelete, "/groups/9999", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGroupController_ListPermissions_WithDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, tenantID := setupGroupCRUDTestDB(t)
	perms := []models.Permission{
		{ID: 1, Resource: "contacts", Action: "read"},
		{ID: 2, Resource: "tickets", Action: "write"},
	}

	router := newGroupRouter(db, tenantID.String(), &mockPermRepo{perms: perms})
	req := httptest.NewRequest(http.MethodGet, "/permissions", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp []map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if len(resp) != 2 {
		t.Fatalf("expected 2 permissions, got %d", len(resp))
	}
}
