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

// ── P1-1: no-escalation de alcance + enum + tenant-guard de cargoId ──────────
//
// Estes testes fecham o escalonamento de privilégio confirmado na auditoria de
// QA: UpdateUser/CreateUser aceitavam `alcance` livre (só validando tamanho) e
// `cargoId` sem checar o tenant, permitindo a um portador de users:update se
// auto-promover a alcance=plataforma → bypass total do RBAC + rotas SaaS.

func TestUserController_UpdateUser_BlocksSelfPromotionToPlataforma(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", alcance) VALUES (?,?,?,?,?)`,
		"Atend", "atend@test.com", "hash", tenantID, "proprio")
	var uid int
	db.Raw(`SELECT LASTVAL()`).Scan(&uid)

	payload, _ := json.Marshal(map[string]interface{}{"alcance": "plataforma"})
	ctrl := NewUserController(&mockUserRepo{db: db}, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", fmt.Sprintf("/users/%d", uid), payload)
	c.Set("alcance", "proprio") // ator é atendente (não admin) — modela o ataque
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", uid)}}

	ctrl.UpdateUser(c)

	assert.Equal(t, http.StatusForbidden, w.Code,
		"auto-promoção a alcance=plataforma deveria retornar 403: %s", w.Body.String())

	var got string
	db.Raw(`SELECT alcance FROM "Users" WHERE id = ?`, uid).Scan(&got)
	assert.Equal(t, "proprio", got, "o alcance NÃO deveria ter sido elevado no banco")
}

func TestUserController_UpdateUser_RejectsInvalidAlcance(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", alcance) VALUES (?,?,?,?,?)`,
		"U", "u@test.com", "hash", tenantID, "proprio")
	var uid int
	db.Raw(`SELECT LASTVAL()`).Scan(&uid)

	payload, _ := json.Marshal(map[string]interface{}{"alcance": "banana"})
	ctrl := NewUserController(&mockUserRepo{db: db}, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", fmt.Sprintf("/users/%d", uid), payload)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", uid)}}

	ctrl.UpdateUser(c)

	assert.Equal(t, http.StatusBadRequest, w.Code,
		"alcance fora do enum deveria retornar 400: %s", w.Body.String())
}

func TestUserController_UpdateUser_RejectsCrossTenantCargo(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()
	otherTenant := uuid.New()

	foreignCargo := models.Cargo{Name: "Administrador", TenantID: otherTenant}
	require.NoError(t, db.Create(&foreignCargo).Error)

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", alcance) VALUES (?,?,?,?,?)`,
		"U", "u2@test.com", "hash", tenantID, "proprio")
	var uid int
	db.Raw(`SELECT LASTVAL()`).Scan(&uid)

	payload, _ := json.Marshal(map[string]interface{}{"cargoId": foreignCargo.ID})
	ctrl := NewUserController(&mockUserRepo{db: db}, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", fmt.Sprintf("/users/%d", uid), payload)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", uid)}}

	ctrl.UpdateUser(c)

	assert.Equal(t, http.StatusBadRequest, w.Code,
		"cargoId de outro tenant deveria retornar 400: %s", w.Body.String())
}

func TestUserController_UpdateUser_AllowsAlcanceWithinActorScope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", alcance) VALUES (?,?,?,?,?)`,
		"U", "u3@test.com", "hash", tenantID, "proprio")
	var uid int
	db.Raw(`SELECT LASTVAL()`).Scan(&uid)

	// Ator alcance=tenant (default do helper) pode conceder até "setor" (<= tenant).
	payload, _ := json.Marshal(map[string]interface{}{"alcance": "setor"})
	ctrl := NewUserController(&mockUserRepo{db: db}, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", fmt.Sprintf("/users/%d", uid), payload)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", uid)}}

	ctrl.UpdateUser(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	var got string
	db.Raw(`SELECT alcance FROM "Users" WHERE id = ?`, uid).Scan(&got)
	assert.Equal(t, "setor", got, "alcance dentro do escopo do ator deveria persistir")
}

func TestUserController_CreateUser_BlocksAlcanceAboveActor(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{
		"name": "New", "email": "new@test.com", "password": "secret123", "alcance": "plataforma",
	})
	ctrl := NewUserController(&mockUserRepo{db: db}, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "POST", "/users", payload)
	c.Set("alcance", "proprio")

	ctrl.CreateUser(c)

	assert.Equal(t, http.StatusForbidden, w.Code,
		"criar usuário com alcance acima do ator deveria retornar 403: %s", w.Body.String())
}

func TestUserController_CreateUser_RejectsCrossTenantCargo(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()
	otherTenant := uuid.New()

	foreignCargo := models.Cargo{Name: "Gestor", TenantID: otherTenant}
	require.NoError(t, db.Create(&foreignCargo).Error)

	payload, _ := json.Marshal(map[string]interface{}{
		"name": "New", "email": "new2@test.com", "password": "secret123", "cargoId": foreignCargo.ID,
	})
	ctrl := NewUserController(&mockUserRepo{db: db}, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "POST", "/users", payload)

	ctrl.CreateUser(c)

	assert.Equal(t, http.StatusBadRequest, w.Code,
		"criar usuário com cargoId de outro tenant deveria retornar 400: %s", w.Body.String())
}

// ── P1-2: self-service "Meu perfil" (/me) ───────────────────────────────────
//
// A rota /me não tem RequirePermission — qualquer usuário autenticado edita o
// próprio perfil. UpdateMe nunca aceita campos de RBAC (alcance/cargoId/setores),
// então o caminho sem-gate não reabre o vetor de auto-promoção.

func TestUserController_GetMe_ReturnsOwnProfile(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", alcance) VALUES (?,?,?,?,?)`,
		"Self", "self@test.com", "hash", tenantID, "proprio")
	var uid int
	db.Raw(`SELECT LASTVAL()`).Scan(&uid)

	ctrl := NewUserController(&mockUserRepo{db: db}, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "GET", "/me", nil)
	c.Set("userId", float64(uid))

	ctrl.GetMe(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "self@test.com", resp["email"], "GetMe deveria retornar o perfil do próprio usuário")
}

func TestUserController_UpdateMe_SelfServiceAllowsProfileEdit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	// Usuário SEM cargo e alcance=proprio — modela o Atendente que hoje toma
	// 403 no PUT /users/:id (bug P1-2). Via /me deve conseguir editar.
	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", alcance) VALUES (?,?,?,?,?)`,
		"Atend", "atend2@test.com", "hash", tenantID, "proprio")
	var uid int
	db.Raw(`SELECT LASTVAL()`).Scan(&uid)

	payload, _ := json.Marshal(map[string]interface{}{"name": "Novo Nome", "password": "novasenha123"})
	ctrl := NewUserController(&mockUserRepo{db: db}, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", "/me", payload)
	c.Set("alcance", "proprio")
	c.Set("userId", float64(uid))

	ctrl.UpdateMe(c)

	require.Equal(t, http.StatusOK, w.Code,
		"atendente deveria conseguir editar o próprio perfil via /me: %s", w.Body.String())
	var name string
	db.Raw(`SELECT name FROM "Users" WHERE id = ?`, uid).Scan(&name)
	assert.Equal(t, "Novo Nome", name)
}

func TestUserController_UpdateMe_IgnoresRBACFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", alcance) VALUES (?,?,?,?,?)`,
		"Self", "self2@test.com", "hash", tenantID, "proprio")
	var uid int
	db.Raw(`SELECT LASTVAL()`).Scan(&uid)

	// Tenta escalar via /me: name legítimo + alcance ilegítimo no mesmo payload.
	payload, _ := json.Marshal(map[string]interface{}{"name": "Renomeado", "alcance": "plataforma", "cargoId": 999})
	ctrl := NewUserController(&mockUserRepo{db: db}, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", "/me", payload)
	c.Set("alcance", "proprio")
	c.Set("userId", float64(uid))

	ctrl.UpdateMe(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	var row struct {
		Name    string
		Alcance string
	}
	db.Raw(`SELECT name, alcance FROM "Users" WHERE id = ?`, uid).Scan(&row)
	assert.Equal(t, "Renomeado", row.Name, "o campo de perfil (name) deveria ter sido aplicado")
	assert.Equal(t, "proprio", row.Alcance, "UpdateMe NÃO pode gravar alcance (campo de RBAC) — auto-promoção bloqueada")
}
