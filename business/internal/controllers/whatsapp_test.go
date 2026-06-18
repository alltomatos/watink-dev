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
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
)

// MockChannelSessionRepo implements domain.ChannelSessionRepository for testing.
type MockChannelSessionRepo struct {
	mock.Mock
}

func (m *MockChannelSessionRepo) FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*domain.ChannelSession, error) {
	args := m.Called(ctx, id, tenantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ChannelSession), args.Error(1)
}

func (m *MockChannelSessionRepo) FindByIDDetail(ctx context.Context, id int, tenantID uuid.UUID) (*models.Whatsapp, error) {
	args := m.Called(ctx, id, tenantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Whatsapp), args.Error(1)
}

func (m *MockChannelSessionRepo) FindAll(ctx context.Context, tenantID uuid.UUID) ([]domain.ChannelSession, error) {
	args := m.Called(ctx, tenantID)
	return args.Get(0).([]domain.ChannelSession), args.Error(1)
}

func (m *MockChannelSessionRepo) Create(ctx context.Context, session *domain.ChannelSession) error {
	args := m.Called(ctx, session)
	return args.Error(0)
}

func (m *MockChannelSessionRepo) Update(ctx context.Context, session *domain.ChannelSession, fields map[string]interface{}) error {
	args := m.Called(ctx, session, fields)
	return args.Error(0)
}

func (m *MockChannelSessionRepo) Delete(ctx context.Context, id int, tenantID uuid.UUID) error {
	args := m.Called(ctx, id, tenantID)
	return args.Error(0)
}

func (m *MockChannelSessionRepo) ResetDefaultFlag(ctx context.Context, tenantID uuid.UUID) error {
	args := m.Called(ctx, tenantID)
	return args.Error(0)
}

func (m *MockChannelSessionRepo) DeleteWithRelations(ctx context.Context, id int, tenantID uuid.UUID) error {
	args := m.Called(ctx, id, tenantID)
	return args.Error(0)
}

// MockPlanLimitSvc implements domain.PlanLimitServiceInterface for testing.
type MockPlanLimitSvc struct {
	mock.Mock
}

func (m *MockPlanLimitSvc) CheckLimit(tenantID uuid.UUID, resource string) error {
	args := m.Called(tenantID, resource)
	return args.Error(0)
}

var testTenantID = uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

// newWhatsappTestDB returns a PostgreSQL test DB via testutil.
func newWhatsappTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

// setupWhatsappRouter creates a test router with tenantId and db injected into context.
func setupWhatsappRouter(ctrl *WhatsappController, method, path string, handler gin.HandlerFunc, db *gorm.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("tenantId", testTenantID)
		c.Set("db", db)
		c.Set("userProfile", "admin")
		c.Next()
	})
	router.Handle(method, path, handler)
	return router
}

func TestWhatsappController_ListWhatsapps_Success(t *testing.T) {
	db := newWhatsappTestDB(t)
	repo := new(MockChannelSessionRepo)
	planSvc := new(MockPlanLimitSvc)
	ctrl := NewWhatsappController(repo, planSvc, nil, nil)

	sessions := []domain.ChannelSession{
		{ID: 1, Name: "WA-1", TenantID: testTenantID, Status: "DISCONNECTED"},
	}
	repo.On("FindAll", mock.Anything, testTenantID).Return(sessions, nil)

	router := setupWhatsappRouter(ctrl, http.MethodGet, "/whatsapp", ctrl.ListWhatsapps, db)
	req := httptest.NewRequest(http.MethodGet, "/whatsapp", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusOK, res.Code)
	var body []map[string]interface{}
	assert.NoError(t, json.Unmarshal(res.Body.Bytes(), &body))
	assert.Len(t, body, 1)
	repo.AssertExpectations(t)
}

func TestWhatsappController_ListWhatsapps_RepoError(t *testing.T) {
	db := newWhatsappTestDB(t)
	repo := new(MockChannelSessionRepo)
	planSvc := new(MockPlanLimitSvc)
	ctrl := NewWhatsappController(repo, planSvc, nil, nil)

	repo.On("FindAll", mock.Anything, testTenantID).Return([]domain.ChannelSession{}, errors.New("db error"))

	router := setupWhatsappRouter(ctrl, http.MethodGet, "/whatsapp", ctrl.ListWhatsapps, db)
	req := httptest.NewRequest(http.MethodGet, "/whatsapp", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusInternalServerError, res.Code)
	repo.AssertExpectations(t)
}

func TestWhatsappController_ShowWhatsapp_Success(t *testing.T) {
	db := newWhatsappTestDB(t)
	repo := new(MockChannelSessionRepo)
	planSvc := new(MockPlanLimitSvc)
	ctrl := NewWhatsappController(repo, planSvc, nil, nil)

	wa := &models.Whatsapp{ID: 1, Name: "WA-1", TenantID: testTenantID, Status: "CONNECTED"}
	repo.On("FindByIDDetail", mock.Anything, 1, testTenantID).Return(wa, nil)

	router := setupWhatsappRouter(ctrl, http.MethodGet, "/whatsapp/:id", ctrl.ShowWhatsapp, db)
	req := httptest.NewRequest(http.MethodGet, "/whatsapp/1", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusOK, res.Code)
	var body map[string]interface{}
	assert.NoError(t, json.Unmarshal(res.Body.Bytes(), &body))
	assert.Equal(t, "WA-1", body["name"])
	repo.AssertExpectations(t)
}

func TestWhatsappController_ShowWhatsapp_NotFound(t *testing.T) {
	db := newWhatsappTestDB(t)
	repo := new(MockChannelSessionRepo)
	planSvc := new(MockPlanLimitSvc)
	ctrl := NewWhatsappController(repo, planSvc, nil, nil)

	repo.On("FindByIDDetail", mock.Anything, 42, testTenantID).Return(nil, nil)

	router := setupWhatsappRouter(ctrl, http.MethodGet, "/whatsapp/:id", ctrl.ShowWhatsapp, db)
	req := httptest.NewRequest(http.MethodGet, "/whatsapp/42", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusNotFound, res.Code)
	assert.Contains(t, res.Body.String(), "not found")
	repo.AssertExpectations(t)
}

func TestWhatsappController_CreateWhatsapp_Success(t *testing.T) {
	db := newWhatsappTestDB(t)
	repo := new(MockChannelSessionRepo)
	planSvc := new(MockPlanLimitSvc)
	ctrl := NewWhatsappController(repo, planSvc, nil, nil)

	planSvc.On("CheckLimit", testTenantID, "connections").Return(nil)
	repo.On("Create", mock.Anything, mock.AnythingOfType("*domain.ChannelSession")).Return(nil)

	router := setupWhatsappRouter(ctrl, http.MethodPost, "/whatsapp", ctrl.CreateWhatsapp, db)
	payload := map[string]interface{}{"name": "WA-New"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/whatsapp", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusOK, res.Code)
	var respBody map[string]interface{}
	assert.NoError(t, json.Unmarshal(res.Body.Bytes(), &respBody))
	assert.Equal(t, "DISCONNECTED", respBody["status"])
	repo.AssertExpectations(t)
	planSvc.AssertExpectations(t)
}

func TestWhatsappController_CreateWhatsapp_PlanLimitExceeded(t *testing.T) {
	db := newWhatsappTestDB(t)
	repo := new(MockChannelSessionRepo)
	planSvc := new(MockPlanLimitSvc)
	ctrl := NewWhatsappController(repo, planSvc, nil, nil)

	planSvc.On("CheckLimit", testTenantID, "connections").Return(errors.New("limit exceeded"))

	router := setupWhatsappRouter(ctrl, http.MethodPost, "/whatsapp", ctrl.CreateWhatsapp, db)
	payload := map[string]interface{}{"name": "WA-Over"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/whatsapp", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusForbidden, res.Code)
	planSvc.AssertExpectations(t)
}

func TestWhatsappController_UpdateWhatsapp_NotFound(t *testing.T) {
	db := newWhatsappTestDB(t)
	repo := new(MockChannelSessionRepo)
	planSvc := new(MockPlanLimitSvc)
	ctrl := NewWhatsappController(repo, planSvc, nil, nil)

	repo.On("FindByID", mock.Anything, 99, testTenantID).Return(nil, nil)

	router := setupWhatsappRouter(ctrl, http.MethodPut, "/whatsapp/:id", ctrl.UpdateWhatsapp, db)
	payload := map[string]interface{}{"name": "WA-Updated"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPut, "/whatsapp/99", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusNotFound, res.Code)
	repo.AssertExpectations(t)
}

func TestWhatsappController_UpdateWhatsapp_Success(t *testing.T) {
	db := newWhatsappTestDB(t)
	repo := new(MockChannelSessionRepo)
	planSvc := new(MockPlanLimitSvc)
	ctrl := NewWhatsappController(repo, planSvc, nil, nil)

	existing := &domain.ChannelSession{ID: 1, Name: "Old", TenantID: testTenantID}
	updated := &domain.ChannelSession{ID: 1, Name: "New", TenantID: testTenantID}

	repo.On("FindByID", mock.Anything, 1, testTenantID).Return(existing, nil).Once()
	repo.On("Update", mock.Anything, existing, mock.AnythingOfType("map[string]interface {}")).Return(nil)
	repo.On("FindByID", mock.Anything, 1, testTenantID).Return(updated, nil).Once()

	router := setupWhatsappRouter(ctrl, http.MethodPut, "/whatsapp/:id", ctrl.UpdateWhatsapp, db)
	payload := map[string]interface{}{"name": "New"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPut, "/whatsapp/1", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusOK, res.Code)
	repo.AssertExpectations(t)
}

func TestWhatsappController_DeleteWhatsapp_NotFound(t *testing.T) {
	db := newWhatsappTestDB(t)
	repo := new(MockChannelSessionRepo)
	planSvc := new(MockPlanLimitSvc)
	ctrl := NewWhatsappController(repo, planSvc, nil, nil)

	repo.On("FindByID", mock.Anything, 55, testTenantID).Return(nil, nil)

	router := setupWhatsappRouter(ctrl, http.MethodDelete, "/whatsapp/:id", ctrl.DeleteWhatsapp, db)
	req := httptest.NewRequest(http.MethodDelete, "/whatsapp/55", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusNotFound, res.Code)
	repo.AssertExpectations(t)
}
