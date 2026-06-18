package controllers

import (
	"bytes"
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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// ── mock implementations ─────────────────────────────────────────────────────

type mockUserRepo struct {
	db *gorm.DB
}

func (m *mockUserRepo) FindAll(ctx context.Context, tenantID uuid.UUID) ([]domain.User, error) {
	var rows []struct {
		ID       int
		Name     string
		Email    string
		Profile  string
		TenantID string `gorm:"column:tenantId"`
	}
	if err := m.db.Raw(`SELECT id, name, email, profile, "tenantId" FROM "Users" WHERE "tenantId" = ?`, tenantID).Scan(&rows).Error; err != nil {
		return nil, err
	}
	users := make([]domain.User, len(rows))
	for i, r := range rows {
		tid, _ := uuid.Parse(r.TenantID)
		users[i] = domain.User{ID: r.ID, Name: r.Name, Email: r.Email, Profile: r.Profile, TenantID: tid}
	}
	return users, nil
}

func (m *mockUserRepo) FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*domain.User, error) {
	var row struct {
		ID       int
		Name     string
		Email    string
		Profile  string
		TenantID string `gorm:"column:tenantId"`
		Configs  string
	}
	res := m.db.Raw(`SELECT id, name, email, profile, "tenantId", configs FROM "Users" WHERE id = ? AND "tenantId" = ?`, id, tenantID).Scan(&row)
	if res.Error != nil {
		return nil, res.Error
	}
	if row.ID == 0 {
		return nil, nil
	}
	tid, _ := uuid.Parse(row.TenantID)
	return &domain.User{ID: row.ID, Name: row.Name, Email: row.Email, Profile: row.Profile, TenantID: tid, Configs: row.Configs}, nil
}

func (m *mockUserRepo) FindByIDDetail(ctx context.Context, id int, tenantID uuid.UUID) (*models.User, error) {
	var u models.User
	res := m.db.Raw(`SELECT * FROM "Users" WHERE id = ? AND "tenantId" = ?`, id, tenantID).Scan(&u)
	if res.Error != nil {
		return nil, res.Error
	}
	if u.ID == 0 {
		return nil, nil
	}
	return &u, nil
}

func (m *mockUserRepo) FindByEmail(ctx context.Context, email string, tenantID uuid.UUID) (*domain.User, error) {
	return nil, nil
}

func (m *mockUserRepo) FindByEmailForAuth(ctx context.Context, email string) (*domain.User, error) {
	return nil, nil
}

func (m *mockUserRepo) Create(ctx context.Context, user *domain.User) error {
	res := m.db.Exec(
		`INSERT INTO "Users" (name, email, "passwordHash", profile, "tenantId", configs, "createdAt", "updatedAt") VALUES (?,?,?,?,?,?, NOW(), NOW())`,
		user.Name, user.Email, user.PasswordHash, user.Profile, user.TenantID, user.Configs,
	)
	if res.Error != nil {
		return res.Error
	}
	// fetch the last inserted id
	var id int
	m.db.Raw(`SELECT LASTVAL()`).Scan(&id)
	user.ID = id
	return nil
}

func (m *mockUserRepo) Update(ctx context.Context, user *domain.User, fields map[string]interface{}) error {
	return m.db.Exec(`UPDATE "Users" SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?`,
		fields["name"], fields["email"], user.ID).Error
}

func (m *mockUserRepo) Delete(ctx context.Context, id int, tenantID uuid.UUID) error {
	res := m.db.Exec(`DELETE FROM "Users" WHERE id = ? AND "tenantId" = ?`, id, tenantID)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (m *mockUserRepo) Save(ctx context.Context, user *domain.User) error {
	return m.db.Table(`"Users"`).Where("id = ?", user.ID).Save(user).Error
}

type mockPlanLimit struct{ err error }

func (m *mockPlanLimit) CheckLimit(tenantID uuid.UUID, resource string) error { return m.err }

// ── helpers ───────────────────────────────────────────────────────────────────

func setupUserTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func setupUserContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	var req *http.Request
	if body != nil {
		req, _ = http.NewRequest(method, path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, path, nil)
	}
	c.Request = req
	c.Set("tenantId", tenantID)
	c.Set("userProfile", "admin")
	c.Set("userId", float64(1))
	scoped := db.Where(`"tenantId" = ?`, tenantID)
	c.Set("db", scoped)
	return c, w
}

// ── tests ─────────────────────────────────────────────────────────────────────

func TestUserController_ListUsers_ReturnsEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?,?,?,?)`, "Alice", "alice@test.com", "hash", tenantA)
	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?,?,?,?)`, "Bob", "bob@test.com", "hash", tenantB)

	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantA, "GET", "/users", nil)

	ctrl.ListUsers(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	users := resp["users"].([]interface{})
	assert.Len(t, users, 1)
	assert.Equal(t, "Alice", users[0].(map[string]interface{})["name"])
}

func TestUserController_ShowUser_Found(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?,?,?,?)`, "Carol", "carol@test.com", "hash", tenantID)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "GET", fmt.Sprintf("/users/%d", id), nil)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", id)}}

	ctrl.ShowUser(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Carol", resp["name"])
}

func TestUserController_ShowUser_CrossTenant404(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?,?,?,?)`, "Dave", "dave@test.com", "hash", tenantA)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantB, "GET", fmt.Sprintf("/users/%d", id), nil)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", id)}}

	ctrl.ShowUser(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUserController_CreateUser_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{
		"name":     "Eve",
		"email":    "eve@test.com",
		"password": "secret123",
	})

	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "POST", "/users", payload)

	ctrl.CreateUser(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Eve", resp["name"])
	assert.Equal(t, "{}", resp["configs"])
	assert.NotNil(t, resp["id"])
}

func TestUserController_CreateUser_PlanLimitBlocked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{"name": "X", "email": "x@test.com", "password": "pass"})
	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{err: fmt.Errorf("limit reached")})
	c, w := setupUserContext(t, db, tenantID, "POST", "/users", payload)

	ctrl.CreateUser(c)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestUserController_UpdateUser_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?,?,?,?)`, "Frank", "frank@test.com", "hash", tenantID)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	payload, _ := json.Marshal(map[string]string{"name": "Franklin"})
	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "PUT", fmt.Sprintf("/users/%d", id), payload)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", id)}}

	ctrl.UpdateUser(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUserController_DeleteUser_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?,?,?,?)`, "Grace", "grace@test.com", "hash", tenantID)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "DELETE", fmt.Sprintf("/users/%d", id), nil)
	c.Params = gin.Params{{Key: "userId", Value: fmt.Sprintf("%d", id)}}

	ctrl.DeleteUser(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUserController_DeleteUser_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupUserTestDB(t)
	tenantID := uuid.New()

	repo := &mockUserRepo{db: db}
	ctrl := NewUserController(repo, &mockPlanLimit{})
	c, w := setupUserContext(t, db, tenantID, "DELETE", "/users/9999", nil)
	c.Params = gin.Params{{Key: "userId", Value: "9999"}}

	ctrl.DeleteUser(c)

	// DeleteUser calls userRepo.Delete; when record not found it returns an error → 500 from RespondWithInternalError
	// The controller doesn't differentiate 404 vs 500 for delete, so just check it's not 200
	assert.NotEqual(t, http.StatusOK, w.Code)
}
