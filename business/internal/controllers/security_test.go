package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupGroupTestDB cria um SQLite in-memory com DDL manual para Groups, Roles, Permissions, Users e join tables.
// Nota: GORM gera colunas de join tables em snake_case (group_id, role_id, permission_id),
// mesmo com joinForeignKey:groupId no tag — o nome da constraint é diferente do nome da coluna.
func setupGroupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}

	ddls := []string{
		`CREATE TABLE IF NOT EXISTS "Groups" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			"tenantId" TEXT NOT NULL,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "Roles" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT,
			"isSystem" BOOLEAN DEFAULT false,
			"tenantId" TEXT NOT NULL,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "Permissions" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			resource TEXT NOT NULL,
			action TEXT NOT NULL,
			description TEXT,
			"isSystem" BOOLEAN DEFAULT true,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "Users" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			"passwordHash" TEXT NOT NULL,
			"tokenVersion" INTEGER DEFAULT 0,
			profile TEXT DEFAULT 'admin',
			"whatsappId" INTEGER,
			"tenantId" TEXT NOT NULL,
			"groupId" INTEGER,
			configs TEXT DEFAULT '{}',
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS group_permissions (
			group_id INTEGER NOT NULL,
			permission_id INTEGER NOT NULL,
			PRIMARY KEY (group_id, permission_id)
		)`,
		`CREATE TABLE IF NOT EXISTS group_roles (
			group_id INTEGER NOT NULL,
			role_id INTEGER NOT NULL,
			PRIMARY KEY (group_id, role_id)
		)`,
	}
	for _, ddl := range ddls {
		if err := db.Exec(ddl).Error; err != nil {
			t.Fatal(err)
		}
	}
	return db
}

// TestGroupUpdateRejectsCrossTenantRole verifica que GroupController.Update
// rejeita (400) a associação de roles de outro tenant — fail-fast, não filtro silencioso.
func TestGroupUpdateRejectsCrossTenantRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupGroupTestDB(t)
	controller := NewGroupController(db)

	tenantA := uuid.New()
	tenantB := uuid.New()

	// Seed: grupo no tenant A
	group := models.Group{Name: "Admins", TenantID: tenantA}
	if err := db.Create(&group).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: role no tenant B (target do ataque)
	roleB := models.Role{Name: "SuperAdmin", TenantID: tenantB}
	if err := db.Create(&roleB).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: role no tenant A (role legítima)
	roleA := models.Role{Name: "User", TenantID: tenantA}
	if err := db.Create(&roleA).Error; err != nil {
		t.Fatal(err)
	}

	// Ataque: tentar associar a role do tenant B ao grupo do tenant A
	payload := map[string]interface{}{
		"roles": []int{roleB.ID},
	}
	body, _ := json.Marshal(payload)

	router := gin.New()
	router.PUT("/groups/:groupId", func(c *gin.Context) {
		c.Set("tenantId", tenantA.String())
		c.Set("db", db) // Injetar DB no contexto para getDB(c)
		controller.Update(c)
	})

	req := httptest.NewRequest(http.MethodPut, "/groups/"+strconv.Itoa(group.ID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for cross-tenant role, got %d: %s", res.Code, res.Body.String())
	}

	// Verifica que a associação NÃO foi persistida
	var count int64
	db.Table("group_roles").Where("group_id = ? AND role_id = ?", group.ID, roleB.ID).Count(&count)
	if count != 0 {
		t.Fatal("cross-tenant role association should NOT have been persisted")
	}
}

// TestGroupUpdateAcceptsSameTenantRole verifica que a associação de roles
// do mesmo tenant funciona normalmente após a correção de segurança.
func TestGroupUpdateAcceptsSameTenantRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupGroupTestDB(t)
	controller := NewGroupController(db)

	tenantA := uuid.New()

	group := models.Group{Name: "Admins", TenantID: tenantA}
	if err := db.Create(&group).Error; err != nil {
		t.Fatal(err)
	}

	roleA := models.Role{Name: "User", TenantID: tenantA}
	if err := db.Create(&roleA).Error; err != nil {
		t.Fatal(err)
	}

	payload := map[string]interface{}{
		"roles": []int{roleA.ID},
	}
	body, _ := json.Marshal(payload)

	router := gin.New()
	router.PUT("/groups/:groupId", func(c *gin.Context) {
		c.Set("tenantId", tenantA.String())
		c.Set("db", db) // Injetar DB no contexto para getDB(c)
		controller.Update(c)
	})

	req := httptest.NewRequest(http.MethodPut, "/groups/"+strconv.Itoa(group.ID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for same-tenant role, got %d: %s", res.Code, res.Body.String())
	}

	// Verifica que a associação FOI persistida
	var count int64
	db.Table("group_roles").Where("group_id = ? AND role_id = ?", group.ID, roleA.ID).Count(&count)
	if count != 1 {
		t.Fatalf("same-tenant role association should have been persisted, got count=%d", count)
	}
}

// TestGroupUpdateRejectsInvalidPermission verifica que Permission inexistente
// é rejeitada (400) — cardinalidade fail-fast.
func TestGroupUpdateRejectsInvalidPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupGroupTestDB(t)
	controller := NewGroupController(db)

	tenantA := uuid.New()

	group := models.Group{Name: "Admins", TenantID: tenantA}
	if err := db.Create(&group).Error; err != nil {
		t.Fatal(err)
	}

	// IDs de permissões que não existem no banco
	payload := map[string]interface{}{
		"permissions": []int{99999, 88888},
	}
	body, _ := json.Marshal(payload)

	router := gin.New()
	router.PUT("/groups/:groupId", func(c *gin.Context) {
		c.Set("tenantId", tenantA.String())
		c.Set("db", db) // Injetar DB no contexto para getDB(c)
		controller.Update(c)
	})

	req := httptest.NewRequest(http.MethodPut, "/groups/"+strconv.Itoa(group.ID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for non-existent permission, got %d: %s", res.Code, res.Body.String())
	}
}

// TestRoleUpdateRejectsInvalidPermission verifica que RoleController.Update
// rejeita permissões inexistentes — fail-fast cardinalidade (Permission é global, sem tenantId).
func TestRoleUpdateRejectsInvalidPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}

	ddls := []string{
		`CREATE TABLE IF NOT EXISTS "Roles" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT,
			"isSystem" BOOLEAN DEFAULT false,
			"tenantId" TEXT NOT NULL,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "Permissions" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			resource TEXT NOT NULL,
			action TEXT NOT NULL,
			description TEXT,
			"isSystem" BOOLEAN DEFAULT true,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS role_permissions (
			role_id INTEGER NOT NULL,
			permission_id INTEGER NOT NULL,
			PRIMARY KEY (role_id, permission_id)
		)`,
	}
	for _, ddl := range ddls {
		if err := db.Exec(ddl).Error; err != nil {
			t.Fatal(err)
		}
	}

	controller := NewRoleController(db)
	tenantA := uuid.New()

	role := models.Role{Name: "Operator", TenantID: tenantA}
	if err := db.Create(&role).Error; err != nil {
		t.Fatal(err)
	}

	// Permissões inexistentes
	payload := map[string]interface{}{
		"permissions": []int{99999},
	}
	body, _ := json.Marshal(payload)

	router := gin.New()
	router.PUT("/roles/:roleId", func(c *gin.Context) {
		c.Set("tenantId", tenantA.String())
		c.Set("db", db) // Injetar DB no contexto para getDB(c)
		controller.Update(c)
	})

	req := httptest.NewRequest(http.MethodPut, "/roles/"+strconv.Itoa(role.ID), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for non-existent permission, got %d: %s", res.Code, res.Body.String())
	}
}

// TestVersionController_GetVersion testa o endpoint de versão básico (mocked).
func TestVersionController_GetVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	controller := NewVersionController(db)

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
	db, _ := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	controller := NewVersionController(db)

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
	db, _ := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	controller := NewSwaggerController(db)

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
	db, _ := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	controller := NewSwaggerController(db)

	router := gin.New()
	router.GET("/swagger.json", controller.SwaggerJSON)

	req := httptest.NewRequest(http.MethodGet, "/swagger.json", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized, got %d: %s", res.Code, res.Body.String())
	}
}

// TestSwaggerController_HasSwaggerGroupPermission_SameTenant testa permissão swagger legítima.
func TestSwaggerController_HasSwaggerGroupPermission_SameTenant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupGroupTestDB(t)
	controller := NewSwaggerController(db)

	tenant := uuid.New()

	// Seed: grupo
	group := models.Group{Name: "SwaggerUsers", TenantID: tenant}
	if err := db.Create(&group).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: permissão swagger
	perm := models.Permission{Resource: "view", Action: "swagger", Description: "Allow Swagger Access"}
	if err := db.Create(&perm).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: associação grupo-permissão
	if err := db.Exec("INSERT INTO group_permissions (group_id, permission_id) VALUES (?, ?)", group.ID, perm.ID).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: usuário neste grupo
	user := models.User{Name: "testuser", Email: "test@example.com", PasswordHash: "x", GroupID: &group.ID, TenantID: tenant}
	if err := db.Create(&user).Error; err != nil {
		t.Fatal(err)
	}

	hasAccess := controller.hasSwaggerGroupPermission(user.ID, tenant.String())
	if !hasAccess {
		t.Fatal("expected true for user with valid swagger permission")
	}
}

// TestSwaggerController_HasSwaggerGroupPermission_CrossTenant testa falha de permissão cross-tenant.
func TestSwaggerController_HasSwaggerGroupPermission_CrossTenant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupGroupTestDB(t)
	controller := NewSwaggerController(db)

	tenantA := uuid.New()
	tenantB := uuid.New()

	// Seed: grupo em tenant A
	groupA := models.Group{Name: "UsersA", TenantID: tenantA}
	if err := db.Create(&groupA).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: permissão swagger (global)
	perm := models.Permission{Resource: "view", Action: "swagger", Description: "Allow Swagger Access"}
	if err := db.Create(&perm).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: associação grupoA-permissão
	if err := db.Exec("INSERT INTO group_permissions (group_id, permission_id) VALUES (?, ?)", groupA.ID, perm.ID).Error; err != nil {
		t.Fatal(err)
	}

	// Seed: usuário em tenant A
	userA := models.User{Name: "userA", Email: "a@example.com", PasswordHash: "x", GroupID: &groupA.ID, TenantID: tenantA}
	if err := db.Create(&userA).Error; err != nil {
		t.Fatal(err)
	}

	// Ataque: usuário tenta acessar permissão de outro tenant (B)
	hasAccess := controller.hasSwaggerGroupPermission(userA.ID, tenantB.String())
	if hasAccess {
		t.Fatal("expected false for user accessing cross-tenant swagger permission")
	}
}
