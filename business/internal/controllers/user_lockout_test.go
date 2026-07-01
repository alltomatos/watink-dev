package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Anti-lockout: DeleteUser ────────────────────────────────────────────────

func TestUserController_DeleteUser_BlocksTenantOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Create(&models.Tenant{ID: tenantID, Name: "T"}).Error)
	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?,?,?,?)`, "Owner", "owner@test.com", "hash", tenantID)
	var ownerID int
	db.Raw(`SELECT LASTVAL()`).Scan(&ownerID)
	require.NoError(t, db.Model(&models.Tenant{}).Where("id = ?", tenantID).Update("ownerId", ownerID).Error)

	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "DELETE", fmt.Sprintf("/users/%d", ownerID), nil)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", ownerID)}}

	ctrl.DeleteUser(c)

	assert.Equal(t, http.StatusConflict, w.Code, "deletar o dono do tenant deveria ser bloqueado: %s", w.Body.String())

	var count int64
	db.Model(&models.User{}).Where("id = ?", ownerID).Count(&count)
	assert.Equal(t, int64(1), count, "o dono NÃO deveria ter sido removido do banco")
}

func TestUserController_DeleteUser_BlocksLastAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	adminCargo := models.Cargo{Name: "Administrador", TenantID: tenantID}
	require.NoError(t, db.Create(&adminCargo).Error)

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "cargoId") VALUES (?,?,?,?,?)`,
		"Admin", "admin@test.com", "hash", tenantID, adminCargo.ID)
	var adminID int
	db.Raw(`SELECT LASTVAL()`).Scan(&adminID)

	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "DELETE", fmt.Sprintf("/users/%d", adminID), nil)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", adminID)}}

	ctrl.DeleteUser(c)

	assert.Equal(t, http.StatusConflict, w.Code, "deletar o último Administrador deveria ser bloqueado: %s", w.Body.String())
}

func TestUserController_DeleteUser_AllowsWhenSecondAdminExists(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	adminCargo := models.Cargo{Name: "Administrador", TenantID: tenantID}
	require.NoError(t, db.Create(&adminCargo).Error)

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "cargoId") VALUES (?,?,?,?,?)`,
		"Admin1", "admin1@test.com", "hash", tenantID, adminCargo.ID)
	var admin1ID int
	db.Raw(`SELECT LASTVAL()`).Scan(&admin1ID)
	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "cargoId") VALUES (?,?,?,?,?)`,
		"Admin2", "admin2@test.com", "hash", tenantID, adminCargo.ID)

	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "DELETE", fmt.Sprintf("/users/%d", admin1ID), nil)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", admin1ID)}}

	ctrl.DeleteUser(c)

	assert.Equal(t, http.StatusOK, w.Code, "deletar 1 de 2 Administradores deveria ser permitido: %s", w.Body.String())
}

// ── Anti-lockout: UpdateUser (troca de cargoId) ─────────────────────────────

func TestUserController_UpdateUser_BlocksCargoChangeForOwner(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Create(&models.Tenant{ID: tenantID, Name: "T"}).Error)
	atendenteCargo := models.Cargo{Name: "Atendente", TenantID: tenantID}
	require.NoError(t, db.Create(&atendenteCargo).Error)

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?,?,?,?)`, "Owner", "owner2@test.com", "hash", tenantID)
	var ownerID int
	db.Raw(`SELECT LASTVAL()`).Scan(&ownerID)
	require.NoError(t, db.Model(&models.Tenant{}).Where("id = ?", tenantID).Update("ownerId", ownerID).Error)

	payload, _ := json.Marshal(map[string]interface{}{"cargoId": atendenteCargo.ID})
	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", fmt.Sprintf("/users/%d", ownerID), payload)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", ownerID)}}

	ctrl.UpdateUser(c)

	assert.Equal(t, http.StatusConflict, w.Code, "trocar o cargo do dono para não-Administrador deveria ser bloqueado: %s", w.Body.String())
}

func TestUserController_UpdateUser_BlocksCargoChangeForLastAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	adminCargo := models.Cargo{Name: "Administrador", TenantID: tenantID}
	require.NoError(t, db.Create(&adminCargo).Error)
	atendenteCargo := models.Cargo{Name: "Atendente", TenantID: tenantID}
	require.NoError(t, db.Create(&atendenteCargo).Error)

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "cargoId") VALUES (?,?,?,?,?)`,
		"Admin", "admin3@test.com", "hash", tenantID, adminCargo.ID)
	var adminID int
	db.Raw(`SELECT LASTVAL()`).Scan(&adminID)

	payload, _ := json.Marshal(map[string]interface{}{"cargoId": atendenteCargo.ID})
	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", fmt.Sprintf("/users/%d", adminID), payload)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", adminID)}}

	ctrl.UpdateUser(c)

	assert.Equal(t, http.StatusConflict, w.Code, "trocar o cargo do último Administrador deveria ser bloqueado: %s", w.Body.String())
}

func TestUserController_UpdateUser_AllowsCargoChangeForRegularUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	atendenteCargo := models.Cargo{Name: "Atendente", TenantID: tenantID}
	require.NoError(t, db.Create(&atendenteCargo).Error)
	gestorCargo := models.Cargo{Name: "Gestor", TenantID: tenantID}
	require.NoError(t, db.Create(&gestorCargo).Error)

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "cargoId") VALUES (?,?,?,?,?)`,
		"Regular", "regular@test.com", "hash", tenantID, atendenteCargo.ID)
	var userID int
	db.Raw(`SELECT LASTVAL()`).Scan(&userID)

	payload, _ := json.Marshal(map[string]interface{}{"cargoId": gestorCargo.ID})
	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", fmt.Sprintf("/users/%d", userID), payload)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", userID)}}

	ctrl.UpdateUser(c)

	assert.Equal(t, http.StatusOK, w.Code, "trocar cargo de um usuário comum deveria ser permitido: %s", w.Body.String())
}

// ── Setores no payload de Create/Update ─────────────────────────────────────

func TestUserController_CreateUser_WithSetores_CreatesVinculos(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	setor := models.Setor{Name: "Vendas", TenantID: tenantID}
	require.NoError(t, db.Create(&setor).Error)

	payload, _ := json.Marshal(map[string]interface{}{
		"name": "Helen", "email": "helen@test.com", "password": "secret123",
		"setores": []map[string]interface{}{{"setorId": setor.ID, "ehGestor": true}},
	})
	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "POST", "/users", payload)

	ctrl.CreateUser(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	userID := int(resp["id"].(float64))

	var vinculo models.UserSetor
	require.NoError(t, db.Where(`"userId" = ? AND "setorId" = ?`, userID, setor.ID).First(&vinculo).Error)
	assert.True(t, vinculo.EhGestor)
}

func TestUserController_CreateUser_WithInvalidSetorId_Rejected(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()
	otherTenant := uuid.New()

	setor := models.Setor{Name: "DeOutroTenant", TenantID: otherTenant}
	require.NoError(t, db.Create(&setor).Error)

	payload, _ := json.Marshal(map[string]interface{}{
		"name": "Ivan", "email": "ivan@test.com", "password": "secret123",
		"setores": []map[string]interface{}{{"setorId": setor.ID, "ehGestor": false}},
	})
	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "POST", "/users", payload)

	ctrl.CreateUser(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "setorId de outro tenant deveria ser rejeitado: %s", w.Body.String())
}

func TestUserController_UpdateUser_ReplacesSetores(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	setorA := models.Setor{Name: "A", TenantID: tenantID}
	require.NoError(t, db.Create(&setorA).Error)
	setorB := models.Setor{Name: "B", TenantID: tenantID}
	require.NoError(t, db.Create(&setorB).Error)

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?,?,?,?)`, "Jane", "jane@test.com", "hash", tenantID)
	var userID int
	db.Raw(`SELECT LASTVAL()`).Scan(&userID)
	require.NoError(t, db.Create(&models.UserSetor{UserID: userID, SetorID: setorA.ID, EhGestor: false}).Error)

	payload, _ := json.Marshal(map[string]interface{}{
		"setores": []map[string]interface{}{{"setorId": setorB.ID, "ehGestor": true}},
	})
	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", fmt.Sprintf("/users/%d", userID), payload)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", userID)}}

	ctrl.UpdateUser(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	var countA, countB int64
	db.Model(&models.UserSetor{}).Where(`"userId" = ? AND "setorId" = ?`, userID, setorA.ID).Count(&countA)
	db.Model(&models.UserSetor{}).Where(`"userId" = ? AND "setorId" = ?`, userID, setorB.ID).Count(&countB)
	assert.Equal(t, int64(0), countA, "vínculo antigo (SetorA) deveria ter sido removido (replace, não merge)")
	assert.Equal(t, int64(1), countB, "vínculo novo (SetorB) deveria existir")
}
