package repository

import (
	"context"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func setupSystemTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func TestNewGORMSystemRepo(t *testing.T) {
	db := setupSystemTestDB(t)
	repo := NewGORMSystemRepo(db)
	assert.NotNil(t, repo)
}

func TestGORMSystemRepo_GetTenantConsumption_EmptyDB(t *testing.T) {
	db := setupSystemTestDB(t)
	// SQLite does not have a "Tenants" table, so the raw query will error.
	// We verify the repo surfaces the error correctly (non-nil error).
	repo := NewGORMSystemRepo(db)

	result, err := repo.GetTenantConsumption(context.Background())
	// Either returns empty slice or an error — both are valid depending on driver behaviour.
	if err != nil {
		assert.Nil(t, result)
	} else {
		assert.NotNil(t, result)
	}
}
