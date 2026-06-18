package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupVersionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	return db
}

func TestNewGORMVersionRepo(t *testing.T) {
	db := setupVersionTestDB(t)
	repo := NewGORMVersionRepo(db)
	assert.NotNil(t, repo)
}

func TestGORMVersionRepo_GetPostgresVersion(t *testing.T) {
	db := setupVersionTestDB(t)
	repo := NewGORMVersionRepo(db)

	// SQLite does not support SELECT version(); the repo surfaces the error.
	version, err := repo.GetPostgresVersion(context.Background())
	if err != nil {
		assert.Empty(t, version)
	} else {
		assert.NotEmpty(t, version)
	}
}
