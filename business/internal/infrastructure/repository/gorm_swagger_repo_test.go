package repository

import (
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupSwaggerTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func TestNewGORMSwaggerPermissionRepo(t *testing.T) {
	db := setupSwaggerTestDB(t)
	repo := NewGORMSwaggerPermissionRepo(db)
	assert.NotNil(t, repo)
}

func TestGORMSwaggerPermissionRepo_HasSwaggerPermission_InvalidUserID(t *testing.T) {
	db := setupSwaggerTestDB(t)
	repo := NewGORMSwaggerPermissionRepo(db)

	ok, err := repo.HasSwaggerPermission(0, uuid.New())
	require.NoError(t, err)
	assert.False(t, ok)

	ok, err = repo.HasSwaggerPermission(-1, uuid.New())
	require.NoError(t, err)
	assert.False(t, ok)
}

func TestGORMSwaggerPermissionRepo_HasSwaggerPermission_UserNotFound(t *testing.T) {
	db := setupSwaggerTestDB(t)
	repo := NewGORMSwaggerPermissionRepo(db)

	ok, err := repo.HasSwaggerPermission(9999, uuid.New())
	require.NoError(t, err)
	assert.False(t, ok)
}

func TestGORMSwaggerPermissionRepo_HasSwaggerPermission_UserWithoutCargo(t *testing.T) {
	db := setupSwaggerTestDB(t)
	repo := NewGORMSwaggerPermissionRepo(db)

	tenantID := uuid.New()
	require.NoError(t, db.Exec(
		`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`,
		"Alice", "alice@test.com", "x", tenantID.String(),
	).Error)

	var userID int
	require.NoError(t, db.Raw(`SELECT id FROM "Users" WHERE email = ?`, "alice@test.com").Scan(&userID).Error)

	ok, err := repo.HasSwaggerPermission(userID, tenantID)
	require.NoError(t, err)
	assert.False(t, ok)
}

func TestGORMSwaggerPermissionRepo_HasSwaggerPermission_WithPermission(t *testing.T) {
	db := setupSwaggerTestDB(t)
	repo := NewGORMSwaggerPermissionRepo(db)

	tenantID := uuid.New()
	require.NoError(t, db.Exec(`INSERT INTO "Cargos" (name, "tenantId") VALUES (?, ?)`, "SwaggerUsers", tenantID.String()).Error)
	var cargoID int
	require.NoError(t, db.Raw(`SELECT id FROM "Cargos" WHERE name = ? AND "tenantId" = ?`, "SwaggerUsers", tenantID.String()).Scan(&cargoID).Error)

	require.NoError(t, db.Exec(
		`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "cargoId") VALUES (?, ?, ?, ?, ?)`,
		"Bob", "bob@test.com", "x", tenantID.String(), cargoID,
	).Error)

	var userID int
	require.NoError(t, db.Raw(`SELECT id FROM "Users" WHERE email = ?`, "bob@test.com").Scan(&userID).Error)

	require.NoError(t, db.Exec(`INSERT INTO "Permissions" (resource, action) VALUES (?, ?)`, "swagger", "view").Error)
	var permID int
	require.NoError(t, db.Raw(`SELECT id FROM "Permissions" WHERE resource = ? AND action = ?`, "swagger", "view").Scan(&permID).Error)

	require.NoError(t, db.Exec(`INSERT INTO cargo_permissoes ("cargoId", "permissionId") VALUES (?, ?)`, cargoID, permID).Error)

	ok, err := repo.HasSwaggerPermission(userID, tenantID)
	require.NoError(t, err)
	assert.True(t, ok)
}

func TestGORMSwaggerPermissionRepo_HasSwaggerPermission_NoMatchingPermission(t *testing.T) {
	db := setupSwaggerTestDB(t)
	repo := NewGORMSwaggerPermissionRepo(db)

	tenantID := uuid.New()
	require.NoError(t, db.Exec(`INSERT INTO "Cargos" (name, "tenantId") VALUES (?, ?)`, "Atendente", tenantID.String()).Error)
	var cargoID int
	require.NoError(t, db.Raw(`SELECT id FROM "Cargos" WHERE name = ? AND "tenantId" = ?`, "Atendente", tenantID.String()).Scan(&cargoID).Error)

	require.NoError(t, db.Exec(
		`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "cargoId") VALUES (?, ?, ?, ?, ?)`,
		"Dave", "dave@test.com", "x", tenantID.String(), cargoID,
	).Error)

	var userID int
	require.NoError(t, db.Raw(`SELECT id FROM "Users" WHERE email = ?`, "dave@test.com").Scan(&userID).Error)

	// Add unrelated permission
	require.NoError(t, db.Exec(`INSERT INTO "Permissions" (resource, action) VALUES (?, ?)`, "tickets", "read").Error)
	var permID int
	require.NoError(t, db.Raw(`SELECT id FROM "Permissions" WHERE resource = ? AND action = ?`, "tickets", "read").Scan(&permID).Error)

	require.NoError(t, db.Exec(`INSERT INTO cargo_permissoes ("cargoId", "permissionId") VALUES (?, ?)`, cargoID, permID).Error)

	ok, err := repo.HasSwaggerPermission(userID, tenantID)
	require.NoError(t, err)
	assert.False(t, ok)
}
