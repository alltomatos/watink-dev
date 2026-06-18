package repository

import (
	"context"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupChannelSessionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&TenantTest{}, &models.Whatsapp{}))
	return db
}

func seedChannelSession(t *testing.T, db *gorm.DB, tenantID uuid.UUID, name string) *models.Whatsapp {
	t.Helper()
	w := &models.Whatsapp{
		Name:     name,
		Status:   "CONNECTED",
		TenantID: tenantID,
	}
	require.NoError(t, db.Create(w).Error)
	return w
}

func TestGORMChannelSessionRepo_New(t *testing.T) {
	db := setupChannelSessionTestDB(t)
	repo := NewGORMChannelSessionRepo(db)
	assert.NotNil(t, repo)
}

func TestGORMChannelSessionRepo_Create_And_FindAll(t *testing.T) {
	db := setupChannelSessionTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)
	require.NoError(t, db.Create(&TenantTest{ID: tenantB, Name: "B"}).Error)

	repo := NewGORMChannelSessionRepo(db)
	ctx := context.Background()

	err := repo.Create(ctx, &domain.ChannelSession{
		Name:     "Session Alpha",
		Status:   "DISCONNECTED",
		TenantID: tenantA,
	})
	require.NoError(t, err)

	err = repo.Create(ctx, &domain.ChannelSession{
		Name:     "Session Beta",
		Status:   "CONNECTED",
		TenantID: tenantB,
	})
	require.NoError(t, err)

	sessionsA, err := repo.FindAll(ctx, tenantA)
	require.NoError(t, err)
	assert.Len(t, sessionsA, 1)
	assert.Equal(t, "Session Alpha", sessionsA[0].Name)

	sessionsB, err := repo.FindAll(ctx, tenantB)
	require.NoError(t, err)
	assert.Len(t, sessionsB, 1)
	assert.Equal(t, "Session Beta", sessionsB[0].Name)
}

func TestGORMChannelSessionRepo_FindByID_TenantIsolation(t *testing.T) {
	db := setupChannelSessionTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)
	require.NoError(t, db.Create(&TenantTest{ID: tenantB, Name: "B"}).Error)

	repo := NewGORMChannelSessionRepo(db)
	ctx := context.Background()

	w := seedChannelSession(t, db, tenantA, "WA Session")

	found, err := repo.FindByID(ctx, w.ID, tenantA)
	require.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, "WA Session", found.Name)

	leaked, err := repo.FindByID(ctx, w.ID, tenantB)
	require.NoError(t, err)
	assert.Nil(t, leaked, "VAZAMENTO: sessão de outro tenant não deveria ser visível")
}

func TestGORMChannelSessionRepo_Update(t *testing.T) {
	db := setupChannelSessionTestDB(t)
	tenantA := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)

	repo := NewGORMChannelSessionRepo(db)
	ctx := context.Background()

	w := seedChannelSession(t, db, tenantA, "Session Update")

	err := repo.Update(ctx, &domain.ChannelSession{ID: w.ID, TenantID: tenantA}, map[string]interface{}{"status": "PAUSED"})
	require.NoError(t, err)

	found, err := repo.FindByID(ctx, w.ID, tenantA)
	require.NoError(t, err)
	require.NotNil(t, found)
	assert.Equal(t, "PAUSED", found.Status)
}

func TestGORMChannelSessionRepo_Delete(t *testing.T) {
	db := setupChannelSessionTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)
	require.NoError(t, db.Create(&TenantTest{ID: tenantB, Name: "B"}).Error)

	repo := NewGORMChannelSessionRepo(db)
	ctx := context.Background()

	w := seedChannelSession(t, db, tenantA, "Session Delete")

	// Deletar com tenant errado não deve afetar
	err := repo.Delete(ctx, w.ID, tenantB)
	require.NoError(t, err)

	found, err := repo.FindByID(ctx, w.ID, tenantA)
	require.NoError(t, err)
	assert.NotNil(t, found, "delete com tenant errado não deveria remover o registro")

	// Deletar com tenant correto
	err = repo.Delete(ctx, w.ID, tenantA)
	require.NoError(t, err)

	found, err = repo.FindByID(ctx, w.ID, tenantA)
	require.NoError(t, err)
	assert.Nil(t, found, "registro deveria ter sido removido")
}
