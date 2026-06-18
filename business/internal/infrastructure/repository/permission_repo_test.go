package repository

import (
	"context"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupPermissionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.Permission{}))
	return db
}

func seedPermissions(t *testing.T, db *gorm.DB) []*models.Permission {
	t.Helper()
	perms := []*models.Permission{
		{Resource: "tickets", Action: "read", Description: "Ler tickets"},
		{Resource: "tickets", Action: "write", Description: "Escrever tickets"},
		{Resource: "contacts", Action: "read", Description: "Ler contatos"},
	}
	for _, p := range perms {
		require.NoError(t, db.Create(p).Error)
	}
	return perms
}

func TestGORMPermissionRepo_New(t *testing.T) {
	db := setupPermissionTestDB(t)
	repo := NewGORMPermissionRepo(db)
	assert.NotNil(t, repo)
}

func TestGORMPermissionRepo_FindAll(t *testing.T) {
	db := setupPermissionTestDB(t)
	seedPermissions(t, db)
	repo := NewGORMPermissionRepo(db)
	ctx := context.Background()

	perms, err := repo.FindAll(ctx)
	require.NoError(t, err)
	assert.Len(t, perms, 3)
}

func TestGORMPermissionRepo_FindAll_Empty(t *testing.T) {
	db := setupPermissionTestDB(t)
	repo := NewGORMPermissionRepo(db)
	ctx := context.Background()

	perms, err := repo.FindAll(ctx)
	require.NoError(t, err)
	assert.Empty(t, perms)
}

func TestGORMPermissionRepo_FindByIDs(t *testing.T) {
	db := setupPermissionTestDB(t)
	seeded := seedPermissions(t, db)
	repo := NewGORMPermissionRepo(db)
	ctx := context.Background()

	ids := []int{seeded[0].ID, seeded[2].ID}
	perms, err := repo.FindByIDs(ctx, ids)
	require.NoError(t, err)
	assert.Len(t, perms, 2)

	names := make([]string, len(perms))
	for i, p := range perms {
		names[i] = p.GetName()
	}
	assert.Contains(t, names, "tickets:read")
	assert.Contains(t, names, "contacts:read")
}

func TestGORMPermissionRepo_FindByIDs_Empty(t *testing.T) {
	db := setupPermissionTestDB(t)
	seedPermissions(t, db)
	repo := NewGORMPermissionRepo(db)
	ctx := context.Background()

	perms, err := repo.FindByIDs(ctx, []int{})
	require.NoError(t, err)
	assert.Empty(t, perms)
}

func TestGORMPermissionRepo_FindByIDs_NonExistent(t *testing.T) {
	db := setupPermissionTestDB(t)
	seedPermissions(t, db)
	repo := NewGORMPermissionRepo(db)
	ctx := context.Background()

	perms, err := repo.FindByIDs(ctx, []int{9999, 8888})
	require.NoError(t, err)
	assert.Empty(t, perms)
}
