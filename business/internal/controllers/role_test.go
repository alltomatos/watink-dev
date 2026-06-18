package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// Note: setupRBACTestDB, setupTestContext, sqlitePermRepo are declared in rbac_test.go
// and are available in the same package.

// =====================================================================
// FindRoleByID — package-level helper
// =====================================================================

func TestFindRoleByID_Found(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()

	role := models.Role{Name: "Agent", TenantID: tenantA}
	require.NoError(t, db.Create(&role).Error)

	got, err := FindRoleByID(db, role.ID, tenantA)
	require.NoError(t, err)
	assert.Equal(t, role.ID, got.ID)
	assert.Equal(t, "Agent", got.Name)
}

func TestFindRoleByID_WrongTenant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	role := models.Role{Name: "Secret", TenantID: tenantB}
	require.NoError(t, db.Create(&role).Error)

	_, err := FindRoleByID(db, role.ID, tenantA)
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound, "must not return roles from other tenants")
}

func TestFindRoleByID_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)

	_, err := FindRoleByID(db, 9999, uuid.New())
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

// =====================================================================
// RoleController.Show — happy path (same tenant)
// =====================================================================

func TestRoleController_Show_SameTenant_Found(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()

	role := models.Role{Name: "Supervisor", TenantID: tenantA}
	require.NoError(t, db.Create(&role).Error)

	rc := NewRoleController(&sqlitePermRepo{db})
	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "roleId", Value: "1"}}
	rc.Show(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var got models.Role
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	assert.Equal(t, "Supervisor", got.Name)
	assert.Equal(t, tenantA, got.TenantID)
}

// =====================================================================
// RoleController.Update — name-only update (no permissions)
// =====================================================================

func TestRoleController_Update_NameOnly(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()

	role := models.Role{Name: "Old Name", TenantID: tenantA}
	require.NoError(t, db.Create(&role).Error)

	rc := NewRoleController(&sqlitePermRepo{db})
	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "roleId", Value: "1"}}

	payload := map[string]interface{}{"name": "New Name"}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest("PUT", "/roles/1", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	rc.Update(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var got models.Role
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	assert.Equal(t, "New Name", got.Name)

	// Verify persistence
	var dbRole models.Role
	db.First(&dbRole, role.ID)
	assert.Equal(t, "New Name", dbRole.Name)
}

// =====================================================================
// RoleController.Update — cross-tenant blocked
// =====================================================================

func TestRoleController_Update_CrossTenantBlocked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	roleB := models.Role{Name: "Role B", TenantID: tenantB}
	require.NoError(t, db.Create(&roleB).Error)

	rc := NewRoleController(&sqlitePermRepo{db})
	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "roleId", Value: "1"}}

	payload := map[string]interface{}{"name": "Hijacked"}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest("PUT", "/roles/1", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	rc.Update(c)

	// Should fail: 400 (ErrRecordNotFound → RespondWithBindError)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Verify not mutated
	var dbRole models.Role
	db.First(&dbRole, roleB.ID)
	assert.Equal(t, "Role B", dbRole.Name)
}

// =====================================================================
// RoleController.Update — permission IDs that do not exist → 400
// =====================================================================

func TestRoleController_Update_MissingPermissions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()

	role := models.Role{Name: "Agent", TenantID: tenantA}
	require.NoError(t, db.Create(&role).Error)

	rc := NewRoleController(&sqlitePermRepo{db})
	c, w := setupTestContext(t, db, tenantA)
	c.Params = gin.Params{gin.Param{Key: "roleId", Value: "1"}}

	payload := map[string]interface{}{
		"name":        "Agent",
		"permissions": []int{999, 1000}, // non-existent
	}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest("PUT", "/roles/1", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	rc.Update(c)

	// ErrRecordNotFound when len(found) != len(requested) → RespondWithBindError → 400
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// =====================================================================
// RoleController.Create — missing required name field → 400
// =====================================================================

func TestRoleController_Create_MissingName(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRBACTestDB(t)
	tenantA := uuid.New()

	rc := NewRoleController(&sqlitePermRepo{db})
	c, w := setupTestContext(t, db, tenantA)

	payload := map[string]interface{}{"description": "no name provided"}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest("POST", "/roles", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	rc.Create(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
