package plugins

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/sdk"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// ---- MockWatinkCore implementa sdk.WatinkCore completa ----

type MockWatinkCore struct {
	mock.Mock
	registeredRoutes []registeredRoute
}

type registeredRoute struct {
	Method  string
	Path    string
	Handler gin.HandlerFunc
}

func (m *MockWatinkCore) GetDB() *gorm.DB {
	args := m.Called()
	if db, ok := args.Get(0).(*gorm.DB); ok {
		return db
	}
	return nil
}

func (m *MockWatinkCore) RegisterRoute(method string, path string, handler gin.HandlerFunc) {
	m.Called(method, path, handler)
	m.registeredRoutes = append(m.registeredRoutes, registeredRoute{
		Method: method, Path: path, Handler: handler,
	})
}

func (m *MockWatinkCore) EmitSocketEvent(room string, event string, payload interface{}) {
	m.Called(room, event, payload)
}

func (m *MockWatinkCore) GetStatus() sdk.PluginStatus {
	args := m.Called()
	return args.Get(0).(sdk.PluginStatus)
}

// ---- Helpers ----

func setupPluginTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	// Usar arquivo temporário para garantir persistência entre conexões GORM
	// (SQLite :memory: com cache=shared perde tabelas quando a conexão original fecha)
	tmpFile := t.TempDir() + "/test.db"
	db, err := gorm.Open(sqlite.Open(tmpFile), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	// DDL manual completo para todas as tabelas compatível com SQLite
	db.Exec(`CREATE TABLE IF NOT EXISTS "Tenants" (
		"id" TEXT PRIMARY KEY,
		"name" TEXT NOT NULL,
		"status" TEXT DEFAULT 'active',
		"ownerId" INTEGER,
		"document" TEXT,
		"createdAt" DATETIME,
		"updatedAt" DATETIME
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS "Whatsapps" (
		"id" INTEGER PRIMARY KEY AUTOINCREMENT,
		"name" TEXT NOT NULL UNIQUE,
		"session" TEXT,
		"qrcode" TEXT,
		"status" TEXT,
		"battery" TEXT,
		"plugged" BOOLEAN,
		"isDefault" BOOLEAN DEFAULT false,
		"retries" INTEGER DEFAULT 0,
		"greetingMessage" TEXT,
		"farewellMessage" TEXT,
		"tenantId" TEXT,
		"syncHistory" BOOLEAN DEFAULT false,
		"syncPeriod" TEXT,
		"number" TEXT,
		"profilePicUrl" TEXT,
		"keepAlive" BOOLEAN DEFAULT false,
		"engineType" TEXT DEFAULT 'whatsmeow',
		"wid" TEXT DEFAULT '',
		"createdAt" DATETIME,
		"updatedAt" DATETIME,
		"firstConnection" DATETIME
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS "Contacts" (
		"id" INTEGER PRIMARY KEY AUTOINCREMENT,
		"name" TEXT NOT NULL,
		"number" TEXT UNIQUE,
		"profilePicUrl" TEXT,
		"email" TEXT NOT NULL DEFAULT '',
		"isGroup" BOOLEAN DEFAULT false,
		"tenantId" TEXT,
		"lid" TEXT UNIQUE,
		"walletUserId" INTEGER,
		"createdAt" DATETIME,
		"updatedAt" DATETIME
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS "Tickets" (
		"id" INTEGER PRIMARY KEY AUTOINCREMENT,
		"status" TEXT NOT NULL DEFAULT 'pending',
		"lastMessage" TEXT,
		"contactId" INTEGER,
		"userId" INTEGER,
		"whatsappId" INTEGER,
		"isGroup" BOOLEAN DEFAULT false,
		"unreadMessages" INTEGER,
		"queueId" INTEGER,
		"tenantId" TEXT,
		"createdAt" DATETIME,
		"updatedAt" DATETIME
	)`)
	db.Exec(`CREATE TABLE IF NOT EXISTS "Clients" (
		"id" INTEGER PRIMARY KEY AUTOINCREMENT,
		"name" TEXT NOT NULL,
		"document" TEXT,
		"email" TEXT,
		"phone" TEXT,
		"tenantId" TEXT,
		"createdAt" DATETIME,
		"updatedAt" DATETIME
	)`)
	return db
}

// ---- WebchatPlugin Tests ----

// TestWebchatPlugin_GetManifest verifica metadata do plugin
func TestWebchatPlugin_GetManifest(t *testing.T) {
	p := &WebchatPlugin{}
	m := p.GetManifest()
	assert.Equal(t, "webchat", m.Slug)
	assert.Equal(t, "1.0.0", m.Version)
	assert.Equal(t, "pro", m.Type)
}

// TestWebchatPlugin_OnActivate_RegistersRoutes verifica que 2 rotas são registradas
func TestWebchatPlugin_OnActivate_RegistersRoutes(t *testing.T) {
	db := setupPluginTestDB(t)
	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &WebchatPlugin{}
	err := plugin.OnActivate(mockCore)

	assert.NoError(t, err)
	mockCore.AssertNumberOfCalls(t, "RegisterRoute", 2)
	assert.Len(t, mockCore.registeredRoutes, 2)
	assert.Equal(t, "GET", mockCore.registeredRoutes[0].Method)
	assert.Equal(t, "/webchat/:whatsappId", mockCore.registeredRoutes[0].Path)
	assert.Equal(t, "POST", mockCore.registeredRoutes[1].Method)
	assert.Equal(t, "/webchat/:whatsappId/tickets", mockCore.registeredRoutes[1].Path)
}

// TestWebchatPlugin_GET_ReturnsWhatsAppConfig testa a rota GET com dados reais
func TestWebchatPlugin_GET_ReturnsWhatsAppConfig(t *testing.T) {
	db := setupPluginTestDB(t)
	tenantID := uuid.New()

	whatsapp := models.Whatsapp{
		Name:            "Test Channel",
		GreetingMessage: "Olá!",
		FarewellMessage: "Até logo!",
		TenantID:        tenantID,
	}
	db.Create(&whatsapp)

	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &WebchatPlugin{}
	err := plugin.OnActivate(mockCore)
	assert.NoError(t, err)

	// Simular a rota GET
	r := gin.New()
	r.GET("/webchat/:whatsappId", mockCore.registeredRoutes[0].Handler)

	req := httptest.NewRequest("GET", "/webchat/1", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var body map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	assert.Equal(t, "Test Channel", body["name"])
	assert.Equal(t, "Olá!", body["greetingMessage"])
}

// TestWebchatPlugin_GET_NotFound testa 404 quando WhatsApp não existe
func TestWebchatPlugin_GET_NotFound(t *testing.T) {
	db := setupPluginTestDB(t)
	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &WebchatPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	r.GET("/webchat/:whatsappId", mockCore.registeredRoutes[0].Handler)

	req := httptest.NewRequest("GET", "/webchat/999", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// TestWebchatPlugin_POST_CreatesTicketAndContact testa fluxo completo de POST
func TestWebchatPlugin_POST_CreatesTicketAndContact(t *testing.T) {
	db := setupPluginTestDB(t)
	tenantID := uuid.New()

	whatsapp := models.Whatsapp{
		Name:            "Chat Channel",
		GreetingMessage: "Hi",
		FarewellMessage: "Bye",
		TenantID:        tenantID,
	}
	db.Create(&whatsapp)

	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &WebchatPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	r.POST("/webchat/:whatsappId/tickets", mockCore.registeredRoutes[1].Handler)

	payload := map[string]string{
		"name":    "João",
		"email":   "joao@test.com",
		"phone":   "5511999990000",
		"message": "Preciso de ajuda",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/webchat/1/tickets", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	assert.NotNil(t, resp["ticketId"])
	assert.NotNil(t, resp["contactId"])

	// Verificar persistência no DB (MESMA instância, não nova conexão)
	var contact models.Contact
	result := db.Where("email = ? AND tenantId = ?", "joao@test.com", tenantID).First(&contact)
	assert.NoError(t, result.Error)
	assert.Equal(t, "João", contact.Name)

	var ticket models.Ticket
	result = db.Where("contactId = ?", contact.ID).First(&ticket)
	assert.NoError(t, result.Error)
	assert.Equal(t, "pending", ticket.Status)
}

// ---- ClientesPlugin Tests ----

// TestClientesPlugin_GetManifest verifica metadata
func TestClientesPlugin_GetManifest(t *testing.T) {
	p := &ClientesPlugin{}
	m := p.GetManifest()
	assert.Equal(t, "clientes", m.Slug) //nolint:misspell // PT-BR: slug legítima do plugin
	assert.Equal(t, "1.2.0", m.Version)
}

// TestClientesPlugin_OnInstall_RunsAutoMigrate verifica que AutoMigrate é chamado
func TestClientesPlugin_OnInstall_RunsAutoMigrate(t *testing.T) {
	db := setupPluginTestDB(t)
	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)

	plugin := &ClientesPlugin{}
	if err := plugin.OnInstall(mockCore); err != nil {
		t.Fatal(err)
	}
	assert.True(t, db.Migrator().HasTable("Clients"))
}

// TestClientesPlugin_OnActivate_RegistersRoutes verifica registro de rotas
func TestClientesPlugin_OnActivate_RegistersRoutes(t *testing.T) {
	db := setupPluginTestDB(t)
	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &ClientesPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	mockCore.AssertNumberOfCalls(t, "RegisterRoute", 2)
	assert.Len(t, mockCore.registeredRoutes, 2)
}

// TestClientesPlugin_GET_ReturnsOnlyTenantClients verifica isolamento multitenancy
func TestClientesPlugin_GET_ReturnsOnlyTenantClients(t *testing.T) {
	db := setupPluginTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Create(&models.Client{Name: "Cliente A", Email: "a@test.com", TenantID: tenantA})
	db.Create(&models.Client{Name: "Cliente B", Email: "b@test.com", TenantID: tenantB})

	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &ClientesPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	r.GET("/clientes", func(c *gin.Context) { //nolint:misspell
		c.Set("tenantId", tenantA)
		mockCore.registeredRoutes[0].Handler(c)
	})

	req := httptest.NewRequest("GET", "/clientes", nil) //nolint:misspell
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var clients []models.Client
	if err := json.Unmarshal(w.Body.Bytes(), &clients); err != nil {
		t.Fatal(err)
	}
	assert.Len(t, clients, 1)
	assert.Equal(t, "Cliente A", clients[0].Name)
}

// TestClientesPlugin_POST_EnforcesTenantIDFromContext verifica que tenantId do payload
// é sobrescrito pelo tenantId do contexto JWT (anti-mass-assignment)
func TestClientesPlugin_POST_EnforcesTenantIDFromContext(t *testing.T) {
	db := setupPluginTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &ClientesPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	r.POST("/clientes", func(c *gin.Context) { //nolint:misspell
		c.Set("tenantId", tenantA) // Contexto JWT = TenantA
		mockCore.registeredRoutes[1].Handler(c)
	})

	// Payload malicioso tentando injetar TenantB
	payload := map[string]interface{}{
		"name":     "Hacker",
		"email":    "hack@evil.com",
		"tenantId": tenantB.String(), // tentativa de mass-assignment
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/clientes", bytes.NewReader(body)) //nolint:misspell
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	// Verificar no DB: cliente deve pertencer a TenantA, NÃO a TenantB
	var client models.Client
	db.Where("email = ?", "hack@evil.com").First(&client)
	assert.Equal(t, tenantA, client.TenantID, "tenantId must come from JWT context, not payload")
}

// ---- SaaSPlugin Tests ----

// TestSaaSPlugin_GetManifest verifica metadata
func TestSaaSPlugin_GetManifest(t *testing.T) {
	p := &SaaSPlugin{}
	m := p.GetManifest()
	assert.Equal(t, "saas-plugin", m.Slug)
}

// TestSaaSPlugin_OnActivate_RegistersRoutes verifica registro de rotas
func TestSaaSPlugin_OnActivate_RegistersRoutes(t *testing.T) {
	db := setupPluginTestDB(t)
	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &SaaSPlugin{}
	err := plugin.OnActivate(mockCore)

	assert.NoError(t, err)
	mockCore.AssertNumberOfCalls(t, "RegisterRoute", 2)
	assert.Len(t, mockCore.registeredRoutes, 2)
	assert.Equal(t, "GET", mockCore.registeredRoutes[0].Method)
	assert.Equal(t, "/saas/manager/tenants", mockCore.registeredRoutes[0].Path)
	assert.Equal(t, "POST", mockCore.registeredRoutes[1].Method)
}

// TestSaaSPlugin_GET_ReturnsAllTenants verifica listagem global (sem tenant scope)
func TestSaaSPlugin_GET_ReturnsAllTenants(t *testing.T) {
	db := setupPluginTestDB(t)

	db.Create(&models.Tenant{ID: uuid.New(), Name: "Tenant Alpha"})
	db.Create(&models.Tenant{ID: uuid.New(), Name: "Tenant Beta"})

	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &SaaSPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	r.GET("/saas/manager/tenants", mockCore.registeredRoutes[0].Handler)

	req := httptest.NewRequest("GET", "/saas/manager/tenants", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var tenants []models.Tenant
	if err := json.Unmarshal(w.Body.Bytes(), &tenants); err != nil {
		t.Fatal(err)
	}
	assert.Len(t, tenants, 2)
}

// TestSaaSPlugin_OnInstall verifica que OnInstall não retorna erro (no-op)
func TestSaaSPlugin_OnInstall(t *testing.T) {
	mockCore := new(MockWatinkCore)
	p := &SaaSPlugin{}
	assert.NoError(t, p.OnInstall(mockCore))
}

// TestSaaSPlugin_POST_CreatesTenant verifica que o handler POST cria um Tenant
func TestSaaSPlugin_POST_CreatesTenant(t *testing.T) {
	db := setupPluginTestDB(t)

	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &SaaSPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	r.POST("/saas/manager/tenants", mockCore.registeredRoutes[1].Handler)

	payload := map[string]interface{}{
		"id":   uuid.New().String(),
		"name": "New Tenant",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/saas/manager/tenants", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp models.Tenant
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	assert.Equal(t, "New Tenant", resp.Name)
}

// TestSaaSPlugin_POST_BadJSON_ReturnsBadRequest verifica tratamento de JSON inválido
func TestSaaSPlugin_POST_BadJSON_ReturnsBadRequest(t *testing.T) {
	db := setupPluginTestDB(t)

	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &SaaSPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	r.POST("/saas/manager/tenants", mockCore.registeredRoutes[1].Handler)

	req := httptest.NewRequest("POST", "/saas/manager/tenants", bytes.NewReader([]byte(`{bad json`)))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestClientesPlugin_GET_MissingTenantID_ReturnsBadRequest verifica que GET sem tenantId no contexto retorna 400
func TestClientesPlugin_GET_MissingTenantID_ReturnsBadRequest(t *testing.T) { //nolint:misspell
	db := setupPluginTestDB(t)

	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &ClientesPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	// No tenantId in context — TenantUUIDFromContext will fail
	r.GET("/clientes", mockCore.registeredRoutes[0].Handler) //nolint:misspell

	req := httptest.NewRequest("GET", "/clientes", nil) //nolint:misspell
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestClientesPlugin_POST_MissingTenantID_ReturnsBadRequest verifica que POST sem tenantId no contexto retorna 400
func TestClientesPlugin_POST_MissingTenantID_ReturnsBadRequest(t *testing.T) { //nolint:misspell
	db := setupPluginTestDB(t)

	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &ClientesPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	// No tenantId in context — TenantUUIDFromContext will fail
	r.POST("/clientes", mockCore.registeredRoutes[1].Handler) //nolint:misspell

	payload := map[string]string{"name": "Test"}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest("POST", "/clientes", bytes.NewReader(body)) //nolint:misspell
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestClientesPlugin_POST_BadJSON_ReturnsBadRequest verifica tratamento de JSON inválido no plugin. //nolint:misspell
func TestClientesPlugin_POST_BadJSON_ReturnsBadRequest(t *testing.T) { //nolint:misspell
	db := setupPluginTestDB(t)
	tenantA := uuid.New()

	mockCore := new(MockWatinkCore)
	mockCore.On("GetDB").Return(db)
	mockCore.On("RegisterRoute", mock.Anything, mock.Anything, mock.Anything).Return()

	plugin := &ClientesPlugin{}
	if err := plugin.OnActivate(mockCore); err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	r.POST("/clientes", func(c *gin.Context) { //nolint:misspell
		c.Set("tenantId", tenantA)
		mockCore.registeredRoutes[1].Handler(c)
	})

	req := httptest.NewRequest("POST", "/clientes", bytes.NewReader([]byte(`{bad json`))) //nolint:misspell
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// ---- OnDeactivate smoke tests ----

func TestWebchatPlugin_OnDeactivate(t *testing.T) {
	mockCore := new(MockWatinkCore)
	p := &WebchatPlugin{}
	assert.NoError(t, p.OnDeactivate(mockCore))
}

func TestClientesPlugin_OnDeactivate(t *testing.T) {
	mockCore := new(MockWatinkCore)
	p := &ClientesPlugin{}
	assert.NoError(t, p.OnDeactivate(mockCore))
}

func TestSaaSPlugin_OnDeactivate(t *testing.T) {
	mockCore := new(MockWatinkCore)
	p := &SaaSPlugin{}
	assert.NoError(t, p.OnDeactivate(mockCore))
}
