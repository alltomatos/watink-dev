package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// sqliteVersionRepo adapts *gorm.DB to domain.VersionRepository for tests.
type sqliteVersionRepo struct{ db *gorm.DB }

func (r *sqliteVersionRepo) GetPostgresVersion(ctx context.Context) (string, error) {
	if r.db == nil || r.db.Statement == nil {
		return "", fmt.Errorf("database unavailable")
	}
	var version string
	return version, r.db.WithContext(ctx).Raw("SELECT version()").Scan(&version).Error
}

var _ domain.VersionRepository = (*sqliteVersionRepo)(nil)

// brokenVersionRepo simulates a DB that always returns an error.
type brokenVersionRepo struct{}

func (r *brokenVersionRepo) GetPostgresVersion(_ context.Context) (string, error) {
	return "", fmt.Errorf("database unavailable")
}

var _ domain.VersionRepository = (*brokenVersionRepo)(nil)

// sqliteSwaggerPermRepo adapts *gorm.DB to domain.SwaggerPermissionRepository for tests.
// Reflete a resolução via Cargo/cargo_permissoes (ADR 0022).
type sqliteSwaggerPermRepo struct{ db *gorm.DB }

func (r *sqliteSwaggerPermRepo) HasSwaggerPermission(userID int, tenantID uuid.UUID) (bool, error) {
	var user models.User
	if err := r.db.Where("id = ? AND \"tenantId\" = ?", userID, tenantID).First(&user).Error; err != nil || user.CargoID == nil {
		return false, nil
	}
	var count int64
	r.db.Table("cargo_permissoes AS cp").
		Joins(`JOIN "Permissions" p ON p.id = cp."permissionId"`).
		Where(`cp."cargoId" = ? AND p.resource = ? AND p.action = ?`,
			*user.CargoID, "swagger", "view").
		Count(&count)
	return count > 0, nil
}

var _ domain.SwaggerPermissionRepository = (*sqliteSwaggerPermRepo)(nil)

// setupGroupTestDB cria um banco PostgreSQL de teste com AutoMigrate para todos os modelos.
func setupGroupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

// TestVersionController_GetVersion testa o endpoint de versão básico (mocked).
func TestVersionController_GetVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.NewTestDB(t)
	controller := NewVersionController(&sqliteVersionRepo{db})

	router := gin.New()
	router.GET("/version", controller.GetVersion)

	req := httptest.NewRequest(http.MethodGet, "/version", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", res.Code, res.Body.String())
	}

	var body map[string]string
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatal("invalid JSON response")
	}

	if body["service"] != "watink-business" || body["version"] != "1.3.197" {
		t.Fatalf("unexpected response body: %v", body)
	}
}

// TestVersionController_GetPostgresVersion testa que o endpoint responde gracefulmente
// quando o DB não suporta a query (ex: SQLite em testes). Em produção com Postgres,
// retornaria 200 com a versão real. Aqui validamos que 503 é retornado sem crash.
func TestVersionController_GetPostgresVersion_DBError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	controller := NewVersionController(&brokenVersionRepo{})

	router := gin.New()
	router.GET("/version/postgres", controller.GetPostgresVersion)

	req := httptest.NewRequest(http.MethodGet, "/version/postgres", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	// SQLite não suporta SELECT version() — controller deve retornar 503 graceful
	if res.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 Service Unavailable on unsupported DB, got %d: %s", res.Code, res.Body.String())
	}
}

// TestSwaggerController_SwaggerUI_AccessDenied testa que o endpoint SwaggerUI recusa sem token.
func TestSwaggerController_SwaggerUI_AccessDenied(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.NewTestDB(t)
	controller := NewSwaggerController(&sqliteSwaggerPermRepo{db})

	router := gin.New()
	router.GET("/docs", controller.SwaggerUI)

	req := httptest.NewRequest(http.MethodGet, "/docs", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized, got %d: %s", res.Code, res.Body.String())
	}
}

// TestSwaggerController_SwaggerJSON_AccessDenied testa que o endpoint SwaggerJSON recusa sem token.
func TestSwaggerController_SwaggerJSON_AccessDenied(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.NewTestDB(t)
	controller := NewSwaggerController(&sqliteSwaggerPermRepo{db})

	router := gin.New()
	router.GET("/swagger.json", controller.SwaggerJSON)

	req := httptest.NewRequest(http.MethodGet, "/swagger.json", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized, got %d: %s", res.Code, res.Body.String())
	}
}

// TestSwaggerController_HasSwaggerCargoPermission_SameTenant testa permissão swagger legítima via Cargo.
func TestSwaggerController_HasSwaggerCargoPermission_SameTenant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupGroupTestDB(t)
	controller := NewSwaggerController(&sqliteSwaggerPermRepo{db})

	tenant := uuid.New()

	// Seed: cargo
	cargo := models.Cargo{Name: "SwaggerUsers", TenantID: tenant}
	if err := db.Create(&cargo).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: permissão swagger
	perm := models.Permission{Resource: "swagger", Action: "view", Description: "Allow Swagger Access"}
	if err := db.Create(&perm).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: associação cargo-permissão
	if err := db.Exec(`INSERT INTO cargo_permissoes ("cargoId", "permissionId") VALUES (?, ?)`, cargo.ID, perm.ID).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: usuário com este cargo
	user := models.User{Name: "testuser", Email: "test@example.com", PasswordHash: "x", CargoID: &cargo.ID, TenantID: tenant}
	if err := db.Create(&user).Error; err != nil {
		t.Fatal(err)
	}

	hasAccess := controller.hasSwaggerCargoPermission(user.ID, tenant.String())
	if !hasAccess {
		t.Fatal("expected true for user with valid swagger permission")
	}
}

// TestSwaggerController_HasSwaggerCargoPermission_CrossTenant testa falha de permissão cross-tenant.
func TestSwaggerController_HasSwaggerCargoPermission_CrossTenant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupGroupTestDB(t)
	controller := NewSwaggerController(&sqliteSwaggerPermRepo{db})

	tenantA := uuid.New()
	tenantB := uuid.New()

	// Seed: cargo em tenant A
	cargoA := models.Cargo{Name: "UsersA", TenantID: tenantA}
	if err := db.Create(&cargoA).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: permissão swagger (global)
	perm := models.Permission{Resource: "swagger", Action: "view", Description: "Allow Swagger Access"}
	if err := db.Create(&perm).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: associação cargoA-permissão
	if err := db.Exec(`INSERT INTO cargo_permissoes ("cargoId", "permissionId") VALUES (?, ?)`, cargoA.ID, perm.ID).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: usuário em tenant A
	userA := models.User{Name: "userA", Email: "a@example.com", PasswordHash: "x", CargoID: &cargoA.ID, TenantID: tenantA}
	if err := db.Create(&userA).Error; err != nil {
		t.Fatal(err)
	}

	// Ataque: usuário tenta acessar permissão de outro tenant (B)
	hasAccess := controller.hasSwaggerCargoPermission(userA.ID, tenantB.String())
	if hasAccess {
		t.Fatal("expected false for user accessing cross-tenant swagger permission")
	}
}
