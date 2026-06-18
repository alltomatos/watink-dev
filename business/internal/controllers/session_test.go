package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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
	args := m.Called(ctx, id, tenantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
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

func TestAuthController_Login_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	os.Setenv("JWT_SECRET", "test-secret-key-at-least-32chars!!")
	os.Setenv("JWT_REFRESH_SECRET", "test-refresh-secret-key-32chars!")
	os.Setenv("GIN_MODE", "test")

	mockRepo := new(MockUserRepo)
	controller := NewAuthController(mockRepo)

	tenantID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	// bcrypt hash of "correct_password" (cost 10)
	user := &domain.User{
		ID:           1,
		Email:        "test@watink.com",
		PasswordHash: "$2a$10$ORoXEjnLJ7u4l4Ud0OPr8.FdCHuUyAR7lRJ05gIdiCtSrpVgqP/0e",
		TenantID:     tenantID,
		Profile:      "admin",
	}
	mockRepo.On("FindByEmailForAuth", mock.Anything, "test@watink.com").Return(user, nil)

	router := gin.New()
	router.POST("/login", controller.Login)

	payload := map[string]string{"email": "test@watink.com", "password": "correct_password"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusOK, res.Code)
	var respBody map[string]interface{}
	assert.NoError(t, json.Unmarshal(res.Body.Bytes(), &respBody))
	assert.NotEmpty(t, respBody["token"])
	mockRepo.AssertExpectations(t)
}

func TestAuthController_Logout_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockUserRepo)
	controller := NewAuthController(mockRepo)

	router := gin.New()
	router.DELETE("/logout", controller.Logout)

	req := httptest.NewRequest(http.MethodDelete, "/logout", nil)
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusOK, res.Code)
	assert.Contains(t, res.Body.String(), "Logged out successfully")
}

func TestAuthController_RefreshToken_NoCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)
	os.Setenv("JWT_REFRESH_SECRET", "test-refresh-secret-key-32chars!")

	mockRepo := new(MockUserRepo)
	controller := NewAuthController(mockRepo)

	router := gin.New()
	router.POST("/refresh_token", controller.RefreshToken)

	req := httptest.NewRequest(http.MethodPost, "/refresh_token", nil)
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusUnauthorized, res.Code)
	assert.Contains(t, res.Body.String(), "No refresh token provided")
}

func TestAuthController_RefreshToken_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	os.Setenv("JWT_REFRESH_SECRET", "test-refresh-secret-key-32chars!")

	mockRepo := new(MockUserRepo)
	controller := NewAuthController(mockRepo)

	router := gin.New()
	router.POST("/refresh_token", controller.RefreshToken)

	req := httptest.NewRequest(http.MethodPost, "/refresh_token", nil)
	req.AddCookie(&http.Cookie{Name: "refreshToken", Value: "not.a.valid.jwt"})
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusUnauthorized, res.Code)
	assert.Contains(t, res.Body.String(), "Invalid refresh token")
}

func TestAuthController_RefreshToken_UserNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	refreshSecret := "test-refresh-secret-key-32chars!"
	os.Setenv("JWT_REFRESH_SECRET", refreshSecret)
	os.Setenv("JWT_SECRET", "test-secret-key-at-least-32chars!!")

	tenantID := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	tokenClaims := jwt.MapClaims{
		"id":           float64(99),
		"tenantId":     tenantID.String(),
		"tokenVersion": float64(0),
	}
	rawToken := jwt.NewWithClaims(jwt.SigningMethodHS256, tokenClaims)
	signedToken, _ := rawToken.SignedString([]byte(refreshSecret))

	mockRepo := new(MockUserRepo)
	mockRepo.On("FindByID", mock.Anything, 99, tenantID).Return(nil, nil)

	controller := NewAuthController(mockRepo)

	router := gin.New()
	router.POST("/refresh_token", controller.RefreshToken)

	req := httptest.NewRequest(http.MethodPost, "/refresh_token", nil)
	req.AddCookie(&http.Cookie{Name: "refreshToken", Value: signedToken})
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusUnauthorized, res.Code)
	assert.Contains(t, res.Body.String(), "User not found")
	mockRepo.AssertExpectations(t)
}

func TestAuthController_RefreshToken_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	refreshSecret := "test-refresh-secret-key-32chars!"
	os.Setenv("JWT_REFRESH_SECRET", refreshSecret)
	os.Setenv("JWT_SECRET", "test-secret-key-at-least-32chars!!")

	tenantID := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	tokenClaims := jwt.MapClaims{
		"id":           float64(5),
		"tenantId":     tenantID.String(),
		"tokenVersion": float64(0),
	}
	rawToken := jwt.NewWithClaims(jwt.SigningMethodHS256, tokenClaims)
	signedToken, _ := rawToken.SignedString([]byte(refreshSecret))

	user := &domain.User{
		ID:           5,
		Name:         "Alice",
		Email:        "alice@watink.com",
		TenantID:     tenantID,
		Profile:      "admin",
		TokenVersion: 0,
	}
	mockRepo := new(MockUserRepo)
	mockRepo.On("FindByID", mock.Anything, 5, tenantID).Return(user, nil)

	controller := NewAuthController(mockRepo)

	router := gin.New()
	router.POST("/refresh_token", controller.RefreshToken)

	req := httptest.NewRequest(http.MethodPost, "/refresh_token", nil)
	req.AddCookie(&http.Cookie{Name: "refreshToken", Value: signedToken})
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	assert.Equal(t, http.StatusOK, res.Code)
	var respBody map[string]interface{}
	assert.NoError(t, json.Unmarshal(res.Body.Bytes(), &respBody))
	assert.NotEmpty(t, respBody["token"])
	mockRepo.AssertExpectations(t)
}
