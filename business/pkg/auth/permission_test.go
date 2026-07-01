package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// TenantTest redefine Tenant para uso em testes sem defaults de Postgres
// (gen_random_uuid()) — mesmo padrão de gorm_user_repo_test.go.
type TenantTest struct {
	ID   uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name string    `gorm:"not null" json:"name"`
}

func (TenantTest) TableName() string { return "Tenants" }

// requirePermissionTestCtx wires a real gin.Engine with a route guarded by
// RequirePermission(resource, action), pre-seeding the context the same way
// middleware.IsAuth would (db/userId/tenantId/alcance), then performs the
// request. Returns the recorder so tests can assert the HTTP status and
// whether the downstream handler actually ran (nextCalled).
func requirePermissionTestCtx(t *testing.T, db *gorm.DB, userID int, tenantID uuid.UUID, alcance string, resource, action string) (*httptest.ResponseRecorder, bool) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	nextCalled := false
	router := gin.New()
	router.GET("/", func(c *gin.Context) {
		c.Set("db", db)
		c.Set("userId", float64(userID))
		c.Set("tenantId", tenantID.String())
		c.Set("alcance", alcance)
		c.Next()
	}, RequirePermission(resource, action), func(c *gin.Context) {
		nextCalled = true
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	router.ServeHTTP(w, req)

	return w, nextCalled
}

func seedTenantWithCargo(t *testing.T, db *gorm.DB, cargoName string, perms ...models.Permission) (tenantID uuid.UUID, cargoID int) {
	t.Helper()
	tenantID = uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantID, Name: "T-" + cargoName}).Error)

	cargo := models.Cargo{Name: cargoName, TenantID: tenantID}
	require.NoError(t, db.Create(&cargo).Error)

	for i := range perms {
		p := perms[i]
		require.NoError(t, db.Create(&p).Error)
		require.NoError(t, db.Create(&models.CargoPermissao{CargoID: cargo.ID, PermissionID: p.ID}).Error)
	}
	return tenantID, cargo.ID
}

// (a) alcance=tenant sempre passa, mesmo sem a permission específica no Cargo.
func TestRequirePermission_AlcanceTenant_AlwaysPasses(t *testing.T) {
	db := testutil.NewTestDB(t)

	tenantID, cargoID := seedTenantWithCargo(t, db, "Atendente") // sem nenhuma Permission

	user := &models.User{
		Name: "Gina", Email: "gina@tenant.com", PasswordHash: "$2a$10$hash",
		Alcance: "tenant", TenantID: tenantID, CargoID: &cargoID,
	}
	require.NoError(t, db.Create(user).Error)

	w, nextCalled := requirePermissionTestCtx(t, db, user.ID, tenantID, "tenant", "billing", "manage")
	assert.True(t, nextCalled, "alcance=tenant deve sempre passar, mesmo sem a permission")
	assert.Equal(t, http.StatusOK, w.Code)
}

// alcance=plataforma também deve sempre passar (mesma regra de bypass).
func TestRequirePermission_AlcancePlataforma_AlwaysPasses(t *testing.T) {
	db := testutil.NewTestDB(t)

	tenantID, cargoID := seedTenantWithCargo(t, db, "Atendente")

	user := &models.User{
		Name: "Hugo", Email: "hugo@tenant.com", PasswordHash: "$2a$10$hash",
		Alcance: "plataforma", TenantID: tenantID, CargoID: &cargoID,
	}
	require.NoError(t, db.Create(user).Error)

	_, nextCalled := requirePermissionTestCtx(t, db, user.ID, tenantID, "plataforma", "billing", "manage")
	assert.True(t, nextCalled, "alcance=plataforma deve sempre passar")
}

// (b) alcance=proprio com a permission no cargo → passa.
func TestRequirePermission_AlcanceProprio_ComPermissionNoCargo_Passa(t *testing.T) {
	db := testutil.NewTestDB(t)

	perm := models.Permission{Resource: "tickets", Action: "read"}
	tenantID, cargoID := seedTenantWithCargo(t, db, "Atendente", perm)

	user := &models.User{
		Name: "Ivo", Email: "ivo@tenant.com", PasswordHash: "$2a$10$hash",
		Alcance: "proprio", TenantID: tenantID, CargoID: &cargoID,
	}
	require.NoError(t, db.Create(user).Error)

	w, nextCalled := requirePermissionTestCtx(t, db, user.ID, tenantID, "proprio", "tickets", "read")
	assert.True(t, nextCalled, "usuário com a permission no Cargo deve passar")
	assert.Equal(t, http.StatusOK, w.Code)
}

// (c) alcance=proprio sem a permission → 403.
func TestRequirePermission_AlcanceProprio_SemPermission_Retorna403(t *testing.T) {
	db := testutil.NewTestDB(t)

	perm := models.Permission{Resource: "tickets", Action: "read"}
	tenantID, cargoID := seedTenantWithCargo(t, db, "Atendente", perm)

	user := &models.User{
		Name: "Julia", Email: "julia@tenant.com", PasswordHash: "$2a$10$hash",
		Alcance: "proprio", TenantID: tenantID, CargoID: &cargoID,
	}
	require.NoError(t, db.Create(user).Error)

	w, nextCalled := requirePermissionTestCtx(t, db, user.ID, tenantID, "proprio", "tickets", "reassign")
	assert.False(t, nextCalled, "usuário sem a permission não deve chamar Next()")
	assert.Equal(t, http.StatusForbidden, w.Code)
}

// (d) alcance=setor com a permission via pacote de gestor → passa.
func TestRequirePermission_AlcanceSetor_ViaPacoteDeGestor_Passa(t *testing.T) {
	db := testutil.NewTestDB(t)

	tenantID := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantID, Name: "T-Gestor"}).Error)

	permReassign := models.Permission{Resource: "tickets", Action: "reassign"}
	require.NoError(t, db.Create(&permReassign).Error)

	// Cargo base do usuário NÃO tem a permission.
	atendente := models.Cargo{Name: "Atendente", TenantID: tenantID}
	require.NoError(t, db.Create(&atendente).Error)

	// Cargo "Gestor" no tenant concede tickets:reassign.
	gestorCargo := models.Cargo{Name: "Gestor", TenantID: tenantID}
	require.NoError(t, db.Create(&gestorCargo).Error)
	require.NoError(t, db.Create(&models.CargoPermissao{CargoID: gestorCargo.ID, PermissionID: permReassign.ID}).Error)

	setor := models.Setor{Name: "Vendas", TenantID: tenantID}
	require.NoError(t, db.Create(&setor).Error)

	user := &models.User{
		Name: "Karin", Email: "karin@tenant.com", PasswordHash: "$2a$10$hash",
		Alcance: "setor", TenantID: tenantID, CargoID: &atendente.ID,
	}
	require.NoError(t, db.Create(user).Error)
	require.NoError(t, db.Create(&models.UserSetor{UserID: user.ID, SetorID: setor.ID, EhGestor: true}).Error)

	w, nextCalled := requirePermissionTestCtx(t, db, user.ID, tenantID, "setor", "tickets", "reassign")
	assert.True(t, nextCalled, "gestor de setor deve ganhar a permission via pacote de Gestor")
	assert.Equal(t, http.StatusOK, w.Code)
}

// alcance=setor SEM marca de gestor e sem a permission no Cargo base → 403.
func TestRequirePermission_AlcanceSetor_SemGestor_Retorna403(t *testing.T) {
	db := testutil.NewTestDB(t)

	permReassign := models.Permission{Resource: "tickets", Action: "reassign"}
	tenantID, cargoID := seedTenantWithCargo(t, db, "Atendente") // sem a permission

	gestorCargo := models.Cargo{Name: "Gestor", TenantID: tenantID}
	require.NoError(t, db.Create(&gestorCargo).Error)
	require.NoError(t, db.Create(&permReassign).Error)
	require.NoError(t, db.Create(&models.CargoPermissao{CargoID: gestorCargo.ID, PermissionID: permReassign.ID}).Error)

	user := &models.User{
		Name: "Leo", Email: "leo@tenant.com", PasswordHash: "$2a$10$hash",
		Alcance: "setor", TenantID: tenantID, CargoID: &cargoID,
	}
	require.NoError(t, db.Create(user).Error)
	// Sem UserSetor/ehGestor=true — não deve ganhar o pacote de Gestor.

	w, nextCalled := requirePermissionTestCtx(t, db, user.ID, tenantID, "setor", "tickets", "reassign")
	assert.False(t, nextCalled)
	assert.Equal(t, http.StatusForbidden, w.Code)
}

// Fail-closed: usuário inexistente (userId não bate com nenhum User do
// tenant) deve resultar em 403, nunca passar.
func TestRequirePermission_UsuarioInexistente_FailClosed403(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantID, Name: "T"}).Error)

	w, nextCalled := requirePermissionTestCtx(t, db, 999999, tenantID, "proprio", "tickets", "read")
	assert.False(t, nextCalled)
	assert.Equal(t, http.StatusForbidden, w.Code)
}
