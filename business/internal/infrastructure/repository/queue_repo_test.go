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

func setupQueueTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&TenantTest{}, &models.Whatsapp{}, &models.Queue{}))
	return db
}

func seedQueue(t *testing.T, db *gorm.DB, tenantID uuid.UUID, name, color string) *models.Queue {
	t.Helper()
	q := &models.Queue{
		Name:     name,
		Color:    color,
		TenantID: tenantID,
	}
	require.NoError(t, db.Create(q).Error)
	return q
}

func TestGORMQueueRepo_New(t *testing.T) {
	db := setupQueueTestDB(t)
	repo := NewGORMQueueRepo(db)
	assert.NotNil(t, repo)
}

func TestGORMQueueRepo_Create_And_FindAll(t *testing.T) {
	db := setupQueueTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)
	require.NoError(t, db.Create(&TenantTest{ID: tenantB, Name: "B"}).Error)

	repo := NewGORMQueueRepo(db)
	ctx := context.Background()

	err := repo.Create(ctx, &domain.Queue{
		Name:     "Suporte",
		Color:    "#FF0000",
		TenantID: tenantA,
	}, nil)
	require.NoError(t, err)

	err = repo.Create(ctx, &domain.Queue{
		Name:     "Vendas",
		Color:    "#00FF00",
		TenantID: tenantB,
	}, nil)
	require.NoError(t, err)

	queuesA, err := repo.FindAll(ctx, tenantA)
	require.NoError(t, err)
	assert.Len(t, queuesA, 1)
	assert.Equal(t, "Suporte", queuesA[0].Name)

	queuesB, err := repo.FindAll(ctx, tenantB)
	require.NoError(t, err)
	assert.Len(t, queuesB, 1)
	assert.Equal(t, "Vendas", queuesB[0].Name)
}

func TestGORMQueueRepo_FindByID_TenantIsolation(t *testing.T) {
	db := setupQueueTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)
	require.NoError(t, db.Create(&TenantTest{ID: tenantB, Name: "B"}).Error)

	repo := NewGORMQueueRepo(db)
	ctx := context.Background()

	q := seedQueue(t, db, tenantA, "Queue A", "#AAAAAA")

	found, err := repo.FindByID(ctx, q.ID, tenantA)
	require.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, "Queue A", found.Name)

	leaked, err := repo.FindByID(ctx, q.ID, tenantB)
	require.NoError(t, err)
	assert.Nil(t, leaked, "VAZAMENTO: fila de outro tenant não deveria ser visível")
}

func TestGORMQueueRepo_FindByID_NotFound(t *testing.T) {
	db := setupQueueTestDB(t)
	tenantA := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)

	repo := NewGORMQueueRepo(db)
	ctx := context.Background()

	found, err := repo.FindByID(ctx, 9999, tenantA)
	require.NoError(t, err)
	assert.Nil(t, found)
}

func TestGORMQueueRepo_Update(t *testing.T) {
	db := setupQueueTestDB(t)
	tenantA := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)

	repo := NewGORMQueueRepo(db)
	ctx := context.Background()

	q := seedQueue(t, db, tenantA, "Queue Update", "#111111")

	err := repo.Update(ctx, &domain.Queue{ID: q.ID, TenantID: tenantA}, map[string]interface{}{"name": "Queue Updated"}, nil)
	require.NoError(t, err)

	found, err := repo.FindByID(ctx, q.ID, tenantA)
	require.NoError(t, err)
	require.NotNil(t, found)
	assert.Equal(t, "Queue Updated", found.Name)
}

func TestGORMQueueRepo_Delete_TenantIsolation(t *testing.T) {
	db := setupQueueTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)
	require.NoError(t, db.Create(&TenantTest{ID: tenantB, Name: "B"}).Error)

	repo := NewGORMQueueRepo(db)
	ctx := context.Background()

	q := seedQueue(t, db, tenantA, "Queue Delete", "#222222")

	// Deletar com tenant errado não deve afetar
	err := repo.Delete(ctx, q.ID, tenantB)
	require.NoError(t, err)

	found, err := repo.FindByID(ctx, q.ID, tenantA)
	require.NoError(t, err)
	assert.NotNil(t, found, "delete com tenant errado não deveria remover a fila")

	// Deletar com tenant correto
	err = repo.Delete(ctx, q.ID, tenantA)
	require.NoError(t, err)

	found, err = repo.FindByID(ctx, q.ID, tenantA)
	require.NoError(t, err)
	assert.Nil(t, found, "fila deveria ter sido removida")
}

func TestGORMQueueRepo_FindAll_Empty(t *testing.T) {
	db := setupQueueTestDB(t)
	tenantA := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)

	repo := NewGORMQueueRepo(db)
	ctx := context.Background()

	queues, err := repo.FindAll(ctx, tenantA)
	require.NoError(t, err)
	assert.Empty(t, queues)
}
