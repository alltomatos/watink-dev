package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupRBACTestDB cria DB SQLite com DDL manual compatível para testes de RBAC.
func setupRBACTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	tmpFile := t.TempDir() + "/rbac_test.db"
	db, err := gorm.Open(sqlite.Open(tmpFile), &gorm.Config{})
	require.NoError(t, err)

	ddls := []string{
		`CREATE TABLE IF NOT EXISTS "Roles" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"name" TEXT NOT NULL,
			"description" TEXT,
			"isSystem" BOOLEAN DEFAULT false,
			"tenantId" TEXT,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "Permissions" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"resource" TEXT NOT NULL,
			"action" TEXT NOT NULL,
			"description" TEXT,
			"isSystem" BOOLEAN DEFAULT true,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "role_permissions" (
			"role_id" INTEGER NOT NULL,
			"permission_id" INTEGER NOT NULL,
			PRIMARY KEY ("role_id", "permission_id")
		)`,
		`CREATE TABLE IF NOT EXISTS "Groups" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"name" TEXT NOT NULL,
			"tenantId" TEXT,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "group_permissions" (
			"group_id" INTEGER NOT NULL,
			"permission_id" INTEGER NOT NULL,
			PRIMARY KEY ("group_id", "permission_id")
		)`,
		`CREATE TABLE IF NOT EXISTS "group_roles" (
			"group_id" INTEGER NOT NULL,
			"role_id" INTEGER NOT NULL,
			PRIMARY KEY ("group_id", "role_id")
		)`,
	}
	for _, ddl := range ddls {
		db.Exec(ddl)
	}

	return db
}

// setupTestContext simula o middleware IsAuth + TenantMiddleware completo.
// Retorna o *gin.Context (com DB+tenantId injetados) e o *httptest.ResponseRecorder.
func setupTestContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Injetar dados do JWT (simula TenantMiddleware)
	c.Set("tenantId", tenantID)
	c.Set("userProfile", "admin")
	c.Set("userId", float64(1))

	// Injetar DB com escopo RLS (simula IsAuth middleware: c.Set("db", tx))
	scoped := db.Where("\"tenantId\" = ?", tenantID)
	c.Set("db", scoped)

	return c, w
}

// =====================================================================
// RoleController — Testes Comportamentais
// =====================================================================

func TestRoleController_List_CrossTenantIsolation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Create(&models.Role{Name: "Admin A", TenantID: tenantA})
	db.Create(&models.Role{Name: "Admin B", TenantID: tenantB})
	db.Create(&models.Role{Name: "Agent A", TenantID: tenantA})

	rc := NewRoleController(db)

	c, w := setupTestContext(t, db, tenantA)
	rc.List(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var roles []models.Role
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &roles))
	assert.Len(t, roles, 2, "tenant A must only see its own roles")
	for _, r := range roles {
		assert.Equal(t, tenantA, r.TenantID, "no cross-tenant leakage")
	}
}

func TestRoleController_Show_CrossTenantBlocked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	roleB := models.Role{Name: "Secret Role B", TenantID: tenantB}
	db.Create(&roleB)

	rc := NewRoleController(db)

	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "roleId", Value: "1"}}
	rc.Show(c)

	assert.Equal(t, http.StatusNotFound, w.Code, "tenant A must not see tenant B's role")
}

func TestRoleController_Create_MassAssignmentPrevention(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	rc := NewRoleController(db)

	c, w := setupTestContext(t, db, tenantA)
	payload := map[string]interface{}{
		"name":        "Hacker Role",
		"description": "trying to escape tenant",
		"tenantId":    tenantB.String(),
	}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest("POST", "/roles", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	rc.Create(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var role models.Role
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &role))
	assert.Equal(t, tenantA, role.TenantID, "tenantId must come from JWT context, not payload")

	// Verificar persistência no DB raiz (sem escopo)
	var dbRole models.Role
	db.First(&dbRole, role.ID)
	assert.Equal(t, tenantA, dbRole.TenantID, "DB must reflect JWT tenant, not payload")
}

func TestRoleController_Create_MissingTenantContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)

	rc := NewRoleController(db)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	payload := map[string]string{"name": "Orphan Role"}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest("POST", "/roles", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	rc.Create(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "must reject when tenant context is absent")
}

func TestRoleController_Delete_CrossTenantBlocked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	roleB := models.Role{Name: "Role B", TenantID: tenantB}
	db.Create(&roleB)

	rc := NewRoleController(db)

	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "roleId", Value: "1"}}
	rc.Delete(c)

	assert.Equal(t, http.StatusNotFound, w.Code, "must return 404 when no rows affected")

	var count int64
	db.Model(&models.Role{}).Count(&count)
	assert.Equal(t, int64(1), count, "tenant A must not delete tenant B's role")
}

func TestRoleController_Delete_SameTenant_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()

	roleA := models.Role{Name: "Role A", TenantID: tenantA}
	db.Create(&roleA)

	rc := NewRoleController(db)

	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "roleId", Value: "1"}}
	rc.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var count int64
	db.Model(&models.Role{}).Count(&count)
	assert.Equal(t, int64(0), count, "role should be deleted")
}

func TestRoleController_Update_PermissionAssociation_GlobalScope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()

	perm1 := models.Permission{Resource: "tickets", Action: "read", IsSystem: true}
	perm2 := models.Permission{Resource: "tickets", Action: "write", IsSystem: true}
	db.Create(&perm1)
	db.Create(&perm2)

	role := models.Role{Name: "Agent", TenantID: tenantA}
	db.Create(&role)

	rc := NewRoleController(db)

	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "roleId", Value: "1"}}
	payload := map[string]interface{}{
		"name":        "Agent Updated",
		"description": "with permissions",
		"permissions": []int{1, 2},
	}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest("PUT", "/roles/1", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	rc.Update(c)

	assert.Equal(t, http.StatusOK, w.Code, "permission association should succeed — permissions are global")
}

// =====================================================================
// GroupController — Testes Comportamentais
// =====================================================================

func TestGroupController_List_CrossTenantIsolation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Create(&models.Group{Name: "Group A1", TenantID: tenantA})
	db.Create(&models.Group{Name: "Group B1", TenantID: tenantB})
	db.Create(&models.Group{Name: "Group A2", TenantID: tenantA})

	gc := NewGroupController(db)

	c, w := setupTestContext(t, db, tenantA)
	gc.List(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var groups []models.Group
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &groups))
	assert.Len(t, groups, 2, "tenant A must only see its own groups")
}

func TestGroupController_Show_CrossTenantBlocked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	groupB := models.Group{Name: "Secret Group B", TenantID: tenantB}
	db.Create(&groupB)

	gc := NewGroupController(db)

	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "groupId", Value: "1"}}
	gc.Show(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGroupController_Create_MassAssignmentPrevention(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	gc := NewGroupController(db)

	c, w := setupTestContext(t, db, tenantA)
	payload := map[string]interface{}{
		"name":     "Hacker Group",
		"tenantId": tenantB.String(),
	}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest("POST", "/groups", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	gc.Create(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var group models.Group
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &group))
	assert.Equal(t, tenantA, group.TenantID, "tenantId must come from JWT, not payload")
}

func TestGroupController_Delete_CrossTenantBlocked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	groupB := models.Group{Name: "Group B", TenantID: tenantB}
	db.Create(&groupB)

	gc := NewGroupController(db)

	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "groupId", Value: "1"}}
	gc.Delete(c)

	assert.Equal(t, http.StatusNotFound, w.Code, "must return 404 when no rows affected")

	var count int64
	db.Model(&models.Group{}).Count(&count)
	assert.Equal(t, int64(1), count, "tenant A must not delete tenant B's group")
}

func TestGroupController_Delete_SameTenant_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()

	groupA := models.Group{Name: "Group A", TenantID: tenantA}
	db.Create(&groupA)

	gc := NewGroupController(db)

	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "groupId", Value: "1"}}
	gc.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var count int64
	db.Model(&models.Group{}).Count(&count)
	assert.Equal(t, int64(0), count, "group should be deleted")
}

func TestGroupController_ListPermissions_ReturnsGlobal(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)

	db.Create(&models.Permission{Resource: "users", Action: "read", IsSystem: true})
	db.Create(&models.Permission{Resource: "users", Action: "write", IsSystem: true})

	gc := NewGroupController(db)

	c, w := setupTestContext(t, db, uuid.New())
	gc.ListPermissions(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var perms []models.Permission
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &perms))
	assert.Len(t, perms, 2, "permissions are global catalog — accessible from any tenant")
}
