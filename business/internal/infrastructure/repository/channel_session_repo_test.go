package repository

import (
	"context"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupChannelSessionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
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

func TestGORMChannelSessionRepo_FindByIDDetail(t *testing.T) {
	db := setupChannelSessionTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)
	require.NoError(t, db.Create(&TenantTest{ID: tenantB, Name: "B"}).Error)

	repo := NewGORMChannelSessionRepo(db)
	ctx := context.Background()

	w := seedChannelSession(t, db, tenantA, "Session Detail")

	// FindByIDDetail com tenant correto
	found, err := repo.FindByIDDetail(ctx, w.ID, tenantA)
	require.NoError(t, err)
	require.NotNil(t, found)
	assert.Equal(t, "Session Detail", found.Name)

	// FindByIDDetail com tenant errado → nil
	leaked, err := repo.FindByIDDetail(ctx, w.ID, tenantB)
	require.NoError(t, err)
	assert.Nil(t, leaked, "FindByIDDetail com tenant errado deve retornar nil")

	// FindByIDDetail com ID inexistente → nil
	notFound, err := repo.FindByIDDetail(ctx, 99999, tenantA)
	require.NoError(t, err)
	assert.Nil(t, notFound)
}

func TestGORMChannelSessionRepo_ResetDefaultFlag(t *testing.T) {
	db := setupChannelSessionTestDB(t)
	tenantA := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)

	repo := NewGORMChannelSessionRepo(db)
	ctx := context.Background()

	// Criar sessão com isDefault=true
	w := &models.Whatsapp{Name: "Default Session", Status: "CONNECTED", TenantID: tenantA, IsDefault: true}
	require.NoError(t, db.Create(w).Error)

	// Verificar que está como default
	var before models.Whatsapp
	require.NoError(t, db.First(&before, w.ID).Error)
	assert.True(t, before.IsDefault)

	// ResetDefaultFlag
	err := repo.ResetDefaultFlag(ctx, tenantA)
	require.NoError(t, err)

	var after models.Whatsapp
	require.NoError(t, db.First(&after, w.ID).Error)
	assert.False(t, after.IsDefault, "ResetDefaultFlag deve setar isDefault=false")
}

func TestGORMChannelSessionRepo_DeleteWithRelations(t *testing.T) {
	db := setupChannelSessionTestDB(t)
	// Precisamos das tabelas de Ticket, User, Flow e da join table WhatsappQueues
	require.NoError(t, db.AutoMigrate(&models.Contact{}, &models.Ticket{}, &models.User{}, &models.Flow{}, &models.Queue{}))
	// Criar a tabela WhatsappQueues (usada pelo DeleteWithRelations via raw Exec)
	require.NoError(t, db.Exec(`CREATE TABLE IF NOT EXISTS "WhatsappQueues" ("whatsappId" integer, "queueId" integer, PRIMARY KEY ("whatsappId","queueId"))`).Error)

	tenantA := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "A"}).Error)

	repo := NewGORMChannelSessionRepo(db)
	ctx := context.Background()

	w := seedChannelSession(t, db, tenantA, "Session With Relations")

	// Criar um ticket vinculado à sessão
	contact := &models.Contact{Name: "C", Number: "5500000001", TenantID: tenantA}
	require.NoError(t, db.Create(contact).Error)
	ticket := &models.Ticket{Status: "open", ContactID: contact.ID, WhatsappID: w.ID, TenantID: tenantA}
	require.NoError(t, db.Create(ticket).Error)

	// DeleteWithRelations
	err := repo.DeleteWithRelations(ctx, w.ID, tenantA)
	require.NoError(t, err)

	// A sessão não deve mais existir
	gone, err := repo.FindByID(ctx, w.ID, tenantA)
	require.NoError(t, err)
	assert.Nil(t, gone, "sessão deve ter sido removida")

	// O ticket deve ter whatsappId nullificado
	var updatedTicket models.Ticket
	require.NoError(t, db.First(&updatedTicket, ticket.ID).Error)
	assert.Zero(t, updatedTicket.WhatsappID, "whatsappId do ticket deve ser nulo após DeleteWithRelations")
}
