package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockUserRepo implements domain.UserRepository for testing.
// Only methods used in tests have real behavior; others panic
// to surface accidental usage.
type MockUserRepo struct {
	mock.Mock
}

func (m *MockUserRepo) FindByEmailForAuth(ctx context.Context, email string) (*domain.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepo) FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*domain.User, error) {
	panic("not used in this test")
}

func (m *MockUserRepo) FindByIDDetail(ctx context.Context, id int, tenantID uuid.UUID) (*models.User, error) {
	panic("not used in this test")
}

func (m *MockUserRepo) FindByEmail(ctx context.Context, email string, tenantID uuid.UUID) (*domain.User, error) {
	panic("not used in this test")
}

func (m *MockUserRepo) FindAll(ctx context.Context, tenantID uuid.UUID) ([]domain.User, error) {
	panic("not used in this test")
}

func (m *MockUserRepo) Create(ctx context.Context, user *domain.User) error {
	panic("not used in this test")
}

func (m *MockUserRepo) Update(ctx context.Context, user *domain.User, fields map[string]interface{}) error {
	panic("not used in this test")
}

func (m *MockUserRepo) Delete(ctx context.Context, id int, tenantID uuid.UUID) error {
	panic("not used in this test")
}

func (m *MockUserRepo) Save(ctx context.Context, user *domain.User) error {
	panic("not used in this test")
}

func TestAuthController_Login_InvalidPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockUserRepo)
	controller := NewAuthController(mockRepo)

	// bcrypt hash of "correct_password" — the test sends "wrong_password"
	user := &domain.User{
		ID:           1,
		Email:        "test@watink.com",
		PasswordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
	}

	mockRepo.On("FindByEmailForAuth", mock.Anything, "test@watink.com").
		Return(user, nil)

	router := gin.New()
	router.POST("/login", controller.Login)

	payload := map[string]string{
		"email":    "test@watink.com",
		"password": "wrong_password",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusUnauthorized, res.Code)
	assert.Contains(t, res.Body.String(), "ERR_INVALID_CREDENTIALS")
	mockRepo.AssertExpectations(t)
}

func TestAuthController_Login_UserNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockUserRepo)
	controller := NewAuthController(mockRepo)

	mockRepo.On("FindByEmailForAuth", mock.Anything, "unknown@watink.com").
		Return(nil, nil)

	router := gin.New()
	router.POST("/login", controller.Login)

	payload := map[string]string{
		"email":    "unknown@watink.com",
		"password": "anything",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusUnauthorized, res.Code)
	assert.Contains(t, res.Body.String(), "ERR_INVALID_CREDENTIALS")
	mockRepo.AssertExpectations(t)
}

func TestAuthController_Login_InvalidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockUserRepo)
	controller := NewAuthController(mockRepo)

	router := gin.New()
	router.POST("/login", controller.Login)

	// Missing email field
	payload := map[string]string{
		"password": "anything",
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusBadRequest, res.Code)
}
