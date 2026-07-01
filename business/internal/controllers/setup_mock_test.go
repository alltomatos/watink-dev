package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/gin-gonic/gin"
)

// mockSetupService is a pure in-memory implementation of domain.SetupServiceInterface.
type mockSetupService struct {
	needsSetup bool
	needsErr   error
	initErr    error
	initCalled bool
	lastSeed   domain.TenantSeedData
}

func (m *mockSetupService) NeedsSetup(_ context.Context) (bool, error) {
	return m.needsSetup, m.needsErr
}

func (m *mockSetupService) InitializeTenant(data domain.TenantSeedData) error {
	m.initCalled = true
	m.lastSeed = data
	return m.initErr
}

var _ domain.SetupServiceInterface = (*mockSetupService)(nil)

// TestSetupController_CheckSetup_NeedsSetup verifica resposta quando o sistema
// ainda não foi configurado.
func TestSetupController_CheckSetup_NeedsSetup(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &mockSetupService{needsSetup: true}
	ctrl := NewSetupController(svc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/initial-setup/check", nil)

	ctrl.CheckSetup(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var body map[string]bool
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal("invalid JSON")
	}
	if !body["needsSetup"] {
		t.Fatal("expected needsSetup=true")
	}
}

// TestSetupController_CheckSetup_AlreadyConfigured verifica resposta quando o
// sistema já está configurado.
func TestSetupController_CheckSetup_AlreadyConfigured(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &mockSetupService{needsSetup: false}
	ctrl := NewSetupController(svc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/initial-setup/check", nil)

	ctrl.CheckSetup(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var body map[string]bool
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshal body: %v", err)
	}
	if body["needsSetup"] {
		t.Fatal("expected needsSetup=false")
	}
}

// TestSetupController_CheckSetup_ServiceError verifica degradação graciosa
// quando o service retorna erro.
func TestSetupController_CheckSetup_ServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &mockSetupService{needsErr: errors.New("db connection lost")}
	ctrl := NewSetupController(svc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/initial-setup/check", nil)

	ctrl.CheckSetup(c)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

// TestSetupController_InitialSetup_AlreadyInitialized verifica que o endpoint
// rejeita (403) quando o sistema já foi configurado — proteção contra re-setup.
func TestSetupController_InitialSetup_AlreadyInitialized(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &mockSetupService{needsSetup: false}
	ctrl := NewSetupController(svc)

	payload := map[string]string{
		"firstName": "Admin",
		"email":     "admin@test.com",
		"password":  "secret123",
	}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/initial-setup", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ctrl.InitialSetup(c)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden, got %d: %s", w.Code, w.Body.String())
	}
	if svc.initCalled {
		t.Fatal("InitializeTenant must NOT be called when system is already initialized")
	}
}

// TestSetupController_InitialSetup_Success verifica que o fluxo happy path
// chama InitializeTenant com os dados corretos do payload.
func TestSetupController_InitialSetup_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &mockSetupService{needsSetup: true}
	ctrl := NewSetupController(svc)

	payload := map[string]string{
		"companyName": "Acme Ltda",
		"firstName":   "Ronaldo",
		"lastName":    "Davi",
		"email":       "ronaldo@watink.com",
		"password":    "strongpass",
	}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/initial-setup", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ctrl.InitialSetup(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if !svc.initCalled {
		t.Fatal("InitializeTenant must be called")
	}
	if svc.lastSeed.Email != "ronaldo@watink.com" {
		t.Fatalf("expected email=ronaldo@watink.com, got %s", svc.lastSeed.Email)
	}
}

// TestSetupController_InitialSetup_MissingRequiredFields verifica que campos
// obrigatórios ausentes resultam em 400 (binding validation).
func TestSetupController_InitialSetup_MissingRequiredFields(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := &mockSetupService{needsSetup: true}
	ctrl := NewSetupController(svc)

	// email ausente — campo obrigatório
	payload := map[string]string{"firstName": "Admin", "password": "pass"}
	body, _ := json.Marshal(payload)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("POST", "/initial-setup", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	ctrl.InitialSetup(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}
