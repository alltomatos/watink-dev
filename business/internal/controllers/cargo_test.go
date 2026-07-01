package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// setupCargoTestDB reuses the same Postgres-schema-per-test harness as the
// rest of the controllers package (testutil.NewTestDB already migrates
// Cargo/Permission/CargoPermissao/User — see testutil/db.go allModels()).
func setupCargoTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

// setupCargoContext mirrors setupPipelineContext (pipeline_test.go) but does
// NOT pre-bake a `.Where("tenantId"=?)` into the "db" stashed in the gin
// context — ListPermissionsCatalog reads Permission (a table WITHOUT a
// tenantId column) straight off auth.GetDB(c), same as production's
// middleware.IsAuth (which stores a plain `db.Session(...)`, no filter).
// Pre-baking tenantId here would break that query on Postgres ("column
// tenantId does not exist" on Permissions). auth.GetScoped(c, "Cargos") still
// adds its own tenantId filter on top for the other handlers, so this does
// not weaken tenant isolation for Cargo itself.
func setupCargoContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	var req *http.Request
	if body != nil {
		req, _ = http.NewRequest(method, path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, path, nil)
	}
	c.Request = req

	c.Set("tenantId", tenantID.String())
	c.Set("alcance", "tenant")
	c.Set("userId", float64(1))
	c.Set("db", db)

	return c, w
}

func setupCargoContextWithParam(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string, body []byte, paramKey, paramVal string) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	c, w := setupCargoContext(t, db, tenantID, method, path, body)
	c.Params = gin.Params{{Key: paramKey, Value: paramVal}}
	return c, w
}

func seedPermission(t *testing.T, db *gorm.DB, resource, action string) int {
	t.Helper()
	require.NoError(t, db.Exec(
		`INSERT INTO "Permissions" (resource, action, description, "isSystem") VALUES (?, ?, ?, ?)`,
		resource, action, resource+":"+action, true,
	).Error)
	var id int
	require.NoError(t, db.Raw(`SELECT id FROM "Permissions" WHERE resource = ? AND action = ?`, resource, action).Scan(&id).Error)
	return id
}

func seedCargo(t *testing.T, db *gorm.DB, tenantID uuid.UUID, name string) int {
	t.Helper()
	require.NoError(t, db.Exec(`INSERT INTO "Cargos" (name, description, "tenantId") VALUES (?, ?, ?)`, name, "", tenantID).Error)
	var id int
	require.NoError(t, db.Raw(`SELECT id FROM "Cargos" WHERE "tenantId" = ? AND name = ?`, tenantID, name).Scan(&id).Error)
	return id
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

func TestCargoController_List_TenantIsolation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	seedCargo(t, db, tenantA, "Atendente")
	seedCargo(t, db, tenantB, "Outro Tenant")

	ctrl := NewCargoController()
	c, w := setupCargoContext(t, db, tenantA, "GET", "/cargos", nil)

	ctrl.List(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())
	var cargos []map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &cargos))
	assert.Len(t, cargos, 1)
	assert.Equal(t, "Atendente", cargos[0]["name"])
}

// ---------------------------------------------------------------------------
// Show
// ---------------------------------------------------------------------------

func TestCargoController_Show_PopulatesPermissions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	cargoID := seedCargo(t, db, tenantID, "Gestor")
	pid1 := seedPermission(t, db, "tickets", "reassign")
	pid2 := seedPermission(t, db, "sectors", "manage")
	require.NoError(t, db.Exec(`INSERT INTO cargo_permissoes ("cargoId", "permissionId") VALUES (?, ?), (?, ?)`,
		cargoID, pid1, cargoID, pid2).Error)

	ctrl := NewCargoController()
	c, w := setupCargoContextWithParam(t, db, tenantID, "GET", "/cargos/"+strconv.Itoa(cargoID), nil, "cargoId", strconv.Itoa(cargoID))

	ctrl.Show(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	perms, ok := resp["permissions"].([]interface{})
	require.True(t, ok, "permissions must be present and be an array: %v", resp)
	assert.Len(t, perms, 2)
}

func TestCargoController_Show_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	ctrl := NewCargoController()
	c, w := setupCargoContextWithParam(t, db, tenantID, "GET", "/cargos/9999", nil, "cargoId", "9999")

	ctrl.Show(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

func TestCargoController_Create_IgnoresTenantIdInPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()
	foreignTenant := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{
		"name":        "Vendedor",
		"description": "Cargo de vendas",
		"tenantId":    foreignTenant.String(), // mass-assignment attempt
	})
	ctrl := NewCargoController()
	c, w := setupCargoContext(t, db, tenantID, "POST", "/cargos", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusCreated, w.Code, "body: %s", w.Body.String())
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, tenantID.String(), resp["tenantId"])
	assert.NotEqual(t, foreignTenant.String(), resp["tenantId"])
}

func TestCargoController_Create_RejectsEmptyName(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{"name": "   "})
	ctrl := NewCargoController()
	c, w := setupCargoContext(t, db, tenantID, "POST", "/cargos", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

func TestCargoController_Update_PartialOnlyName(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	cargoID := seedCargo(t, db, tenantID, "Antigo")
	pid := seedPermission(t, db, "tickets", "read")
	require.NoError(t, db.Exec(`INSERT INTO cargo_permissoes ("cargoId", "permissionId") VALUES (?, ?)`, cargoID, pid).Error)

	payload, _ := json.Marshal(map[string]interface{}{"name": "Novo Nome"})
	ctrl := NewCargoController()
	c, w := setupCargoContextWithParam(t, db, tenantID, "PUT", "/cargos/"+strconv.Itoa(cargoID), payload, "cargoId", strconv.Itoa(cargoID))

	ctrl.Update(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Novo Nome", resp["name"])

	// permissionIds ausente → não deve ter mexido na junção.
	var count int64
	require.NoError(t, db.Raw(`SELECT COUNT(*) FROM cargo_permissoes WHERE "cargoId" = ?`, cargoID).Scan(&count).Error)
	assert.Equal(t, int64(1), count, "permissions must remain untouched when permissionIds is absent")
}

func TestCargoController_Update_ReplacesPermissionsWhenSent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	cargoID := seedCargo(t, db, tenantID, "Gestor")
	oldPid := seedPermission(t, db, "tickets", "read")
	newPid1 := seedPermission(t, db, "tickets", "reassign")
	newPid2 := seedPermission(t, db, "sectors", "manage")
	require.NoError(t, db.Exec(`INSERT INTO cargo_permissoes ("cargoId", "permissionId") VALUES (?, ?)`, cargoID, oldPid).Error)

	payload, _ := json.Marshal(map[string]interface{}{
		"permissionIds": []int{newPid1, newPid2},
	})
	ctrl := NewCargoController()
	c, w := setupCargoContextWithParam(t, db, tenantID, "PUT", "/cargos/"+strconv.Itoa(cargoID), payload, "cargoId", strconv.Itoa(cargoID))

	ctrl.Update(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	var ids []int
	require.NoError(t, db.Raw(`SELECT "permissionId" FROM cargo_permissoes WHERE "cargoId" = ? ORDER BY "permissionId"`, cargoID).Scan(&ids).Error)
	require.Len(t, ids, 2)
	assert.ElementsMatch(t, []int{newPid1, newPid2}, ids)

	var oldStillThere int64
	require.NoError(t, db.Raw(`SELECT COUNT(*) FROM cargo_permissoes WHERE "cargoId" = ? AND "permissionId" = ?`, cargoID, oldPid).Scan(&oldStillThere).Error)
	assert.Equal(t, int64(0), oldStillThere, "old permission must have been replaced, not merged")
}

func TestCargoController_Update_RejectsInvalidPermissionIds_AppliesNothing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	cargoID := seedCargo(t, db, tenantID, "Gestor")
	validPid := seedPermission(t, db, "tickets", "read")
	require.NoError(t, db.Exec(`INSERT INTO cargo_permissoes ("cargoId", "permissionId") VALUES (?, ?)`, cargoID, validPid).Error)

	payload, _ := json.Marshal(map[string]interface{}{
		"name":          "Deveria Não Aplicar",
		"permissionIds": []int{validPid, 999999},
	})
	ctrl := NewCargoController()
	c, w := setupCargoContextWithParam(t, db, tenantID, "PUT", "/cargos/"+strconv.Itoa(cargoID), payload, "cargoId", strconv.Itoa(cargoID))

	ctrl.Update(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "body: %s", w.Body.String())

	// Nothing should have been applied: name unchanged, permission unchanged.
	var name string
	require.NoError(t, db.Raw(`SELECT name FROM "Cargos" WHERE id = ?`, cargoID).Scan(&name).Error)
	assert.Equal(t, "Gestor", name)

	var count int64
	require.NoError(t, db.Raw(`SELECT COUNT(*) FROM cargo_permissoes WHERE "cargoId" = ?`, cargoID).Scan(&count).Error)
	assert.Equal(t, int64(1), count)
}

func TestCargoController_Update_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{"name": "X"})
	ctrl := NewCargoController()
	c, w := setupCargoContextWithParam(t, db, tenantID, "PUT", "/cargos/9999", payload, "cargoId", "9999")

	ctrl.Update(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

func TestCargoController_Delete_BlockedWhenSoleAdministrador(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	cargoID := seedCargo(t, db, tenantID, "Administrador")

	ctrl := NewCargoController()
	c, w := setupCargoContextWithParam(t, db, tenantID, "DELETE", "/cargos/"+strconv.Itoa(cargoID), nil, "cargoId", strconv.Itoa(cargoID))

	ctrl.Delete(c)

	assert.Equal(t, http.StatusConflict, w.Code, "body: %s", w.Body.String())

	var count int64
	require.NoError(t, db.Raw(`SELECT COUNT(*) FROM "Cargos" WHERE id = ?`, cargoID).Scan(&count).Error)
	assert.Equal(t, int64(1), count, "cargo must not have been deleted")
}

func TestCargoController_Delete_BlockedWhenUsersAssigned(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	cargoID := seedCargo(t, db, tenantID, "Atendente")
	require.NoError(t, db.Exec(
		`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "cargoId") VALUES (?, ?, ?, ?, ?)`,
		"Fulano", "fulano-"+uuid.New().String()+"@example.com", "hash", tenantID, cargoID,
	).Error)

	ctrl := NewCargoController()
	c, w := setupCargoContextWithParam(t, db, tenantID, "DELETE", "/cargos/"+strconv.Itoa(cargoID), nil, "cargoId", strconv.Itoa(cargoID))

	ctrl.Delete(c)

	assert.Equal(t, http.StatusConflict, w.Code, "body: %s", w.Body.String())

	var count int64
	require.NoError(t, db.Raw(`SELECT COUNT(*) FROM "Cargos" WHERE id = ?`, cargoID).Scan(&count).Error)
	assert.Equal(t, int64(1), count, "cargo in use must not have been deleted")
}

func TestCargoController_Delete_AllowedWhenUnused(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	// A second Administrador exists, so deleting THIS one is not the
	// last-admin case; this cargo also has no users pointing at it.
	seedCargo(t, db, tenantID, "Administrador")
	cargoID := seedCargo(t, db, tenantID, "Temporário")
	pid := seedPermission(t, db, "tickets", "read")
	require.NoError(t, db.Exec(`INSERT INTO cargo_permissoes ("cargoId", "permissionId") VALUES (?, ?)`, cargoID, pid).Error)

	ctrl := NewCargoController()
	c, w := setupCargoContextWithParam(t, db, tenantID, "DELETE", "/cargos/"+strconv.Itoa(cargoID), nil, "cargoId", strconv.Itoa(cargoID))

	ctrl.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	var count int64
	require.NoError(t, db.Raw(`SELECT COUNT(*) FROM "Cargos" WHERE id = ?`, cargoID).Scan(&count).Error)
	assert.Equal(t, int64(0), count)

	var joinCount int64
	require.NoError(t, db.Raw(`SELECT COUNT(*) FROM cargo_permissoes WHERE "cargoId" = ?`, cargoID).Scan(&joinCount).Error)
	assert.Equal(t, int64(0), joinCount, "join rows must be cleaned up too")
}

func TestCargoController_Delete_AllowedWhenSecondAdministradorRemoved(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	seedCargo(t, db, tenantID, "Administrador")
	secondAdminID := seedCargo(t, db, tenantID, "Administrador")

	ctrl := NewCargoController()
	c, w := setupCargoContextWithParam(t, db, tenantID, "DELETE", "/cargos/"+strconv.Itoa(secondAdminID), nil, "cargoId", strconv.Itoa(secondAdminID))

	ctrl.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code, "with 2 Administrador cargos, deleting one must be allowed; body: %s", w.Body.String())
}

// ---------------------------------------------------------------------------
// ListPermissionsCatalog
// ---------------------------------------------------------------------------

func TestCargoController_ListPermissionsCatalog_GroupedByResource(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantID := uuid.New()

	seedPermission(t, db, "tickets", "read")
	seedPermission(t, db, "tickets", "reassign")
	seedPermission(t, db, "sectors", "manage")

	ctrl := NewCargoController()
	c, w := setupCargoContext(t, db, tenantID, "GET", "/cargos/catalog/permissions", nil)

	ctrl.ListPermissionsCatalog(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())
	var resp map[string][]map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.Contains(t, resp, "tickets")
	require.Contains(t, resp, "sectors")
	assert.Len(t, resp["tickets"], 2)
	assert.Len(t, resp["sectors"], 1)
}

func TestCargoController_ListPermissionsCatalog_NotTenantScoped(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupCargoTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	seedPermission(t, db, "billing", "view")

	ctrl := NewCargoController()
	// Catalog is global — must return the same data regardless of which
	// tenant is in context (Permission has no tenantId column at all).
	cA, wA := setupCargoContext(t, db, tenantA, "GET", "/cargos/catalog/permissions", nil)
	ctrl.ListPermissionsCatalog(cA)
	cB, wB := setupCargoContext(t, db, tenantB, "GET", "/cargos/catalog/permissions", nil)
	ctrl.ListPermissionsCatalog(cB)

	assert.Equal(t, http.StatusOK, wA.Code)
	assert.Equal(t, http.StatusOK, wB.Code)
	assert.JSONEq(t, wA.Body.String(), wB.Body.String())
}
