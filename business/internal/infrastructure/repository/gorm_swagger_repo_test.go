package repository

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupSwaggerTestDB creates an in-memory SQLite database with the minimal
// schema needed to exercise GORMSwaggerPermissionRepository.
// We use raw DDL because models.User references uuid types that SQLite
// does not support natively via AutoMigrate.
func setupSwaggerTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	ddl := []string{
		`CREATE TABLE IF NOT EXISTS "Users" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			"passwordHash" TEXT NOT NULL,
			"tokenVersion" INTEGER DEFAULT 0,
			profile TEXT DEFAULT 'admin',
			"whatsappId" INTEGER,
			"tenantId" TEXT,
			"groupId" INTEGER,
			configs TEXT,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "Permissions" (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			resource TEXT NOT NULL,
			action TEXT NOT NULL,
			description TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS group_permissions (
			group_id INTEGER,
			permission_id INTEGER
		)`,
	}
	for _, q := range ddl {
		require.NoError(t, db.Exec(q).Error)
	}
	return db
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

func TestGORMSwaggerPermissionRepo_HasSwaggerPermission_UserWithoutGroup(t *testing.T) {
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
	groupID := 1
	require.NoError(t, db.Exec(
		`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "groupId") VALUES (?, ?, ?, ?, ?)`,
		"Bob", "bob@test.com", "x", tenantID.String(), groupID,
	).Error)

	var userID int
	require.NoError(t, db.Raw(`SELECT id FROM "Users" WHERE email = ?`, "bob@test.com").Scan(&userID).Error)

	require.NoError(t, db.Exec(`INSERT INTO "Permissions" (resource, action) VALUES (?, ?)`, "view", "swagger").Error)
	var permID int
	require.NoError(t, db.Raw(`SELECT id FROM "Permissions" WHERE resource = ? AND action = ?`, "view", "swagger").Scan(&permID).Error)

	require.NoError(t, db.Exec(`INSERT INTO group_permissions (group_id, permission_id) VALUES (?, ?)`, groupID, permID).Error)

	ok, err := repo.HasSwaggerPermission(userID, tenantID)
	require.NoError(t, err)
	assert.True(t, ok)
}

func TestGORMSwaggerPermissionRepo_HasSwaggerPermission_WithViewSwaggerPermission(t *testing.T) {
	db := setupSwaggerTestDB(t)
	repo := NewGORMSwaggerPermissionRepo(db)

	tenantID := uuid.New()
	groupID := 2
	require.NoError(t, db.Exec(
		`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "groupId") VALUES (?, ?, ?, ?, ?)`,
		"Carol", "carol@test.com", "x", tenantID.String(), groupID,
	).Error)

	var userID int
	require.NoError(t, db.Raw(`SELECT id FROM "Users" WHERE email = ?`, "carol@test.com").Scan(&userID).Error)

	require.NoError(t, db.Exec(`INSERT INTO "Permissions" (resource, action) VALUES (?, ?)`, "view_swagger", "allow").Error)
	var permID int
	require.NoError(t, db.Raw(`SELECT id FROM "Permissions" WHERE resource = ? AND action = ?`, "view_swagger", "allow").Scan(&permID).Error)

	require.NoError(t, db.Exec(`INSERT INTO group_permissions (group_id, permission_id) VALUES (?, ?)`, groupID, permID).Error)

	ok, err := repo.HasSwaggerPermission(userID, tenantID)
	require.NoError(t, err)
	assert.True(t, ok)
}

func TestGORMSwaggerPermissionRepo_HasSwaggerPermission_NoMatchingPermission(t *testing.T) {
	db := setupSwaggerTestDB(t)
	repo := NewGORMSwaggerPermissionRepo(db)

	tenantID := uuid.New()
	groupID := 3
	require.NoError(t, db.Exec(
		`INSERT INTO "Users" (name, email, "passwordHash", "tenantId", "groupId") VALUES (?, ?, ?, ?, ?)`,
		"Dave", "dave@test.com", "x", tenantID.String(), groupID,
	).Error)

	var userID int
	require.NoError(t, db.Raw(`SELECT id FROM "Users" WHERE email = ?`, "dave@test.com").Scan(&userID).Error)

	// Add unrelated permission
	require.NoError(t, db.Exec(`INSERT INTO "Permissions" (resource, action) VALUES (?, ?)`, "tickets", "read").Error)
	var permID int
	require.NoError(t, db.Raw(`SELECT id FROM "Permissions" WHERE resource = ? AND action = ?`, "tickets", "read").Scan(&permID).Error)

	require.NoError(t, db.Exec(`INSERT INTO group_permissions (group_id, permission_id) VALUES (?, ?)`, groupID, permID).Error)

	ok, err := repo.HasSwaggerPermission(userID, tenantID)
	require.NoError(t, err)
	assert.False(t, ok)
}
