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

func setupTicketTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func seedTwoTenantsTickets(t *testing.T, db *gorm.DB) (tenantA, tenantB uuid.UUID, ticketA, ticketB *models.Ticket) {
	t.Helper()
	tenantA = uuid.New()
	tenantB = uuid.New()

	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "Tenant A"}).Error)
	require.NoError(t, db.Create(&TenantTest{ID: tenantB, Name: "Tenant B"}).Error)

	// Criar contatos para satisfazer FK
	contactA := &models.Contact{Name: "Contact A", Number: "55111", TenantID: tenantA}
	contactB := &models.Contact{Name: "Contact B", Number: "55222", TenantID: tenantB}
	require.NoError(t, db.Create(contactA).Error)
	require.NoError(t, db.Create(contactB).Error)

	ticketA = &models.Ticket{
		Status:     "open",
		ContactID:  contactA.ID,
		WhatsappID: 1,
		IsGroup:    false,
		TenantID:   tenantA,
	}
	ticketB = &models.Ticket{
		Status:     "pending",
		ContactID:  contactB.ID,
		WhatsappID: 2,
		IsGroup:    false,
		TenantID:   tenantB,
	}
	require.NoError(t, db.Create(ticketA).Error)
	require.NoError(t, db.Create(ticketB).Error)
	return
}

func TestGORMTicketRepo_FindByID_TenantIsolation(t *testing.T) {
	db := setupTicketTestDB(t)
	tenantA, tenantB, ticketA, _ := seedTwoTenantsTickets(t, db)
	repo := NewGORMTicketRepo(db)
	ctx := context.Background()

	// Buscar ticketA com tenantA → deve encontrar
	found, err := repo.FindByID(ctx, ticketA.ID, tenantA)
	assert.NoError(t, err)
	assert.NotNil(t, found, "deveria encontrar o ticket do próprio tenant")
	assert.Equal(t, "open", found.Status)

	// Buscar ticketA com tenantB → deve retornar nil (isolamento)
	leaked, err := repo.FindByID(ctx, ticketA.ID, tenantB)
	assert.NoError(t, err)
	assert.Nil(t, leaked, "VAZAMENTO DE DADOS: encontrou ticket de outro tenant via FindByID")
}

func TestGORMTicketRepo_FindOpenByContact_TenantIsolation(t *testing.T) {
	db := setupTicketTestDB(t)
	tenantA, tenantB, ticketA, _ := seedTwoTenantsTickets(t, db)
	repo := NewGORMTicketRepo(db)
	ctx := context.Background()

	// Buscar ticket aberto do contato A com tenantA → deve encontrar
	found, err := repo.FindOpenByContact(ctx, tenantA, ticketA.ContactID, ticketA.WhatsappID)
	assert.NoError(t, err)
	assert.NotNil(t, found, "deveria encontrar ticket aberto do contato no tenant correto")

	// Buscar mesmo contato+session com tenantB → nil (isolamento)
	leaked, err := repo.FindOpenByContact(ctx, tenantB, ticketA.ContactID, ticketA.WhatsappID)
	assert.NoError(t, err)
	assert.Nil(t, leaked, "VAZAMENTO DE DADOS: encontrou ticket de outro tenant via FindOpenByContact")
}

func TestGORMTicketRepo_Update_TenantIsolation(t *testing.T) {
	db := setupTicketTestDB(t)
	tenantA, tenantB, ticketA, _ := seedTwoTenantsTickets(t, db)
	repo := NewGORMTicketRepo(db)
	ctx := context.Background()

	// Tentar update com tenant errado (tenantB tentando alterar ticketA)
	domainTicket := &domain.Ticket{
		ID:       ticketA.ID,
		TenantID: tenantB,
	}
	fields := map[string]interface{}{"status": "closed"}
	err := repo.Update(ctx, domainTicket, fields)
	assert.NoError(t, err, "update com tenant errado não deve causar erro GORM")

	// ticketA não deve ter sido alterado
	found, err := repo.FindByID(ctx, ticketA.ID, tenantA)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, "open", found.Status, "update com tenant errado não deveria alterar o status")

	// Update com tenant correto
	domainTicket.TenantID = tenantA
	err = repo.Update(ctx, domainTicket, map[string]interface{}{"status": "closed"})
	assert.NoError(t, err)

	found, err = repo.FindByID(ctx, ticketA.ID, tenantA)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, "closed", found.Status, "update com tenant correto deveria alterar o status")
}

func TestGORMTicketRepo_Save(t *testing.T) {
	db := setupTicketTestDB(t)
	tenantA, _, _, _ := seedTwoTenantsTickets(t, db)
	repo := NewGORMTicketRepo(db)
	ctx := context.Background()

	newTicket := &domain.Ticket{
		Status:     "pending",
		ContactID:  999,
		WhatsappID: 1,
		IsGroup:    false,
		TenantID:   tenantA,
	}
	err := repo.Save(ctx, newTicket)
	assert.NoError(t, err, "Save deveria criar o ticket sem erro")
}
