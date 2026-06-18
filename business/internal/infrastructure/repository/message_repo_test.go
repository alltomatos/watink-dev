package repository

import (
	"context"
	"fmt"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupMessageTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func seedMessagePrereqs(t *testing.T, db *gorm.DB) (tenantID uuid.UUID, ticketID int) {
	t.Helper()
	tenantID = uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantID, Name: "Tenant Msg"}).Error)

	contact := &models.Contact{Name: "Sender", Number: "5500000001", TenantID: tenantID}
	require.NoError(t, db.Create(contact).Error)

	ticket := &models.Ticket{Status: "open", ContactID: contact.ID, TenantID: tenantID}
	require.NoError(t, db.Create(ticket).Error)

	return tenantID, ticket.ID
}

func TestGORMMessageRepo_New(t *testing.T) {
	db := setupMessageTestDB(t)
	repo := NewGORMMessageRepo(db)
	assert.NotNil(t, repo)
}

func TestGORMMessageRepo_Create_And_FindByID(t *testing.T) {
	db := setupMessageTestDB(t)
	tenantID, ticketID := seedMessagePrereqs(t, db)
	repo := NewGORMMessageRepo(db)
	ctx := context.Background()

	msg := &domain.Message{
		ID:       "msg-001",
		Body:     "Hello World",
		TicketID: ticketID,
		TenantID: tenantID,
	}
	require.NoError(t, repo.Create(ctx, msg))

	found, err := repo.FindByID(ctx, "msg-001", tenantID)
	require.NoError(t, err)
	require.NotNil(t, found)
	assert.Equal(t, "Hello World", found.Body)
	assert.Equal(t, tenantID, found.TenantID)
}

func TestGORMMessageRepo_FindByID_TenantIsolation(t *testing.T) {
	db := setupMessageTestDB(t)
	tenantA, ticketID := seedMessagePrereqs(t, db)
	tenantB := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantB, Name: "B"}).Error)

	repo := NewGORMMessageRepo(db)
	ctx := context.Background()

	require.NoError(t, repo.Create(ctx, &domain.Message{
		ID:       "msg-iso",
		Body:     "Isolated",
		TicketID: ticketID,
		TenantID: tenantA,
	}))

	leaked, err := repo.FindByID(ctx, "msg-iso", tenantB)
	require.NoError(t, err)
	assert.Nil(t, leaked, "VAZAMENTO: mensagem de outro tenant não deveria ser visível")
}

func TestGORMMessageRepo_FindByID_NotFound(t *testing.T) {
	db := setupMessageTestDB(t)
	tenantID, _ := seedMessagePrereqs(t, db)
	repo := NewGORMMessageRepo(db)
	ctx := context.Background()

	found, err := repo.FindByID(ctx, "nonexistent", tenantID)
	require.NoError(t, err)
	assert.Nil(t, found)
}

func TestGORMMessageRepo_Update(t *testing.T) {
	db := setupMessageTestDB(t)
	tenantID, ticketID := seedMessagePrereqs(t, db)
	repo := NewGORMMessageRepo(db)
	ctx := context.Background()

	require.NoError(t, repo.Create(ctx, &domain.Message{
		ID:       "msg-upd",
		Body:     "Original",
		TicketID: ticketID,
		TenantID: tenantID,
	}))

	err := repo.Update(ctx, &domain.Message{ID: "msg-upd", TenantID: tenantID}, map[string]interface{}{"body": "Updated"})
	require.NoError(t, err)

	found, err := repo.FindByID(ctx, "msg-upd", tenantID)
	require.NoError(t, err)
	require.NotNil(t, found)
	assert.Equal(t, "Updated", found.Body)
}

func TestGORMMessageRepo_CreateIfNotExists(t *testing.T) {
	db := setupMessageTestDB(t)
	tenantID, ticketID := seedMessagePrereqs(t, db)
	repo := NewGORMMessageRepo(db)
	ctx := context.Background()

	msg := &domain.Message{
		ID:       "msg-dedup",
		Body:     "First",
		TicketID: ticketID,
		TenantID: tenantID,
	}
	require.NoError(t, repo.Create(ctx, msg))

	// Segunda inserção com mesmo ID não deve retornar erro
	msg2 := &domain.Message{
		ID:       "msg-dedup",
		Body:     "Second",
		TicketID: ticketID,
		TenantID: tenantID,
	}
	err := repo.CreateIfNotExists(ctx, msg2)
	require.NoError(t, err)

	// Valor original deve persistir
	found, err := repo.FindByID(ctx, "msg-dedup", tenantID)
	require.NoError(t, err)
	require.NotNil(t, found)
	assert.Equal(t, "First", found.Body)
}

func TestGORMMessageRepo_ExistsByID(t *testing.T) {
	db := setupMessageTestDB(t)
	tenantID, ticketID := seedMessagePrereqs(t, db)
	repo := NewGORMMessageRepo(db)
	ctx := context.Background()

	exists, err := repo.ExistsByID(ctx, "msg-exists", tenantID)
	require.NoError(t, err)
	assert.False(t, exists)

	require.NoError(t, repo.Create(ctx, &domain.Message{
		ID:       "msg-exists",
		Body:     "Exists",
		TicketID: ticketID,
		TenantID: tenantID,
	}))

	exists, err = repo.ExistsByID(ctx, "msg-exists", tenantID)
	require.NoError(t, err)
	assert.True(t, exists)
}

func TestGORMMessageRepo_MultipleMessages(t *testing.T) {
	db := setupMessageTestDB(t)
	tenantID, ticketID := seedMessagePrereqs(t, db)
	repo := NewGORMMessageRepo(db)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		require.NoError(t, repo.Create(ctx, &domain.Message{
			ID:       fmt.Sprintf("msg-multi-%d", i),
			Body:     fmt.Sprintf("Body %d", i),
			TicketID: ticketID,
			TenantID: tenantID,
		}))
	}

	var count int64
	db.Model(&models.Message{}).Where("\"tenantId\" = ?", tenantID).Count(&count)
	assert.Equal(t, int64(3), count)
}
