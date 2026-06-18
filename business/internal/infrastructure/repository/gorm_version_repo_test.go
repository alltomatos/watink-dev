package repository

import (
	"context"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func setupVersionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
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
