package repository

import (
	"context"
	"testing"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// SettingTenantTest é um tenant compatível com PostgreSQL.
type SettingTenantTest struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name      string    `gorm:"not null"`
	Status    string    `gorm:"default:'active'"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (SettingTenantTest) TableName() string { return "Tenants" }

func setupSettingTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func TestGORMSettingRepo_FindPublicSettings_ReturnsKeys(t *testing.T) {
	db := setupSettingTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Create(&SettingTenantTest{ID: tenantID, Name: "Tenant Alpha"}).Error)
	require.NoError(t, db.Create(&models.Setting{Key: "primaryColor", Value: "#FF0000", TenantID: tenantID}).Error)
	require.NoError(t, db.Create(&models.Setting{Key: "logoUrl", Value: "https://img.png", TenantID: tenantID}).Error)
	require.NoError(t, db.Create(&models.Setting{Key: "privateKey", Value: "secret", TenantID: tenantID}).Error)

	repo := NewGORMSettingRepo(db)
	ctx := context.Background()

	settings, err := repo.FindPublicSettings(ctx, []string{"primaryColor", "logoUrl"})
	require.NoError(t, err)
	assert.Len(t, settings, 2, "deve retornar apenas as chaves solicitadas")

	keys := make(map[string]string, len(settings))
	for _, s := range settings {
		keys[s.Key] = s.Value
	}
	assert.Equal(t, "#FF0000", keys["primaryColor"])
	assert.Equal(t, "https://img.png", keys["logoUrl"])
	assert.Empty(t, keys["privateKey"], "chave não solicitada não deve aparecer")
}

func TestGORMSettingRepo_FindPublicSettings_NoTenant(t *testing.T) {
	db := setupSettingTestDB(t)
	repo := NewGORMSettingRepo(db)
	ctx := context.Background()

	// Sem nenhum tenant no DB → deve retornar slice vazio, sem erro
	settings, err := repo.FindPublicSettings(ctx, []string{"primaryColor"})
	assert.NoError(t, err)
	assert.Empty(t, settings, "sem tenant deve retornar vazio")
}

func TestGORMSettingRepo_FindPublicSettings_KeyNotPresent(t *testing.T) {
	db := setupSettingTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Create(&SettingTenantTest{ID: tenantID, Name: "Tenant Beta"}).Error)

	repo := NewGORMSettingRepo(db)
	ctx := context.Background()

	settings, err := repo.FindPublicSettings(ctx, []string{"missingKey"})
	assert.NoError(t, err)
	assert.Empty(t, settings, "chave inexistente deve retornar slice vazio")
}
