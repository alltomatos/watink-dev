package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Compile-time interface check.
var _ domain.TicketRepository = (*GORMTicketRepository)(nil)

// GORMTicketRepository implements domain.TicketRepository using GORM.
type GORMTicketRepository struct {
	db *gorm.DB
}

// NewGORMTicketRepo constructs a GORMTicketRepository.
func NewGORMTicketRepo(db *gorm.DB) *GORMTicketRepository {
	return &GORMTicketRepository{db: db}
}

// FindByID returns the ticket with the given id under tenantID, or nil if not found.
func (r *GORMTicketRepository) FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*domain.Ticket, error) {
	var m models.Ticket
	err := r.db.WithContext(ctx).
		Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return ticketModelToDomain(&m), nil
}

// FindOpenByContact returns an open/pending/closed ticket for the given contact+session under tenantID,
// or nil if none exists.
func (r *GORMTicketRepository) FindOpenByContact(ctx context.Context, tenantID uuid.UUID, contactID int, sessionID int) (*domain.Ticket, error) {
	var m models.Ticket
	err := r.db.WithContext(ctx).
		Where("\"contactId\" = ? AND \"whatsappId\" = ? AND \"tenantId\" = ?", contactID, sessionID, tenantID).
		Where("status IN ?", []string{"open", "pending"}).
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return ticketModelToDomain(&m), nil
}

// FindOrCreatePending finds an existing pending ticket or creates a new one.
func (r *GORMTicketRepository) FindOrCreatePending(ctx context.Context, ticket *domain.Ticket) (*domain.Ticket, error) {
	m := ticketDomainToModel(ticket)
	err := r.db.WithContext(ctx).
		Where(models.Ticket{ContactID: ticket.ContactID, WhatsappID: ticket.WhatsappID, Status: "pending", TenantID: ticket.TenantID}).
		First(&m).Error

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if err := r.db.WithContext(ctx).Create(m).Error; err != nil {
			return nil, fmt.Errorf("failed to create ticket: %v", err)
		}
	}

	return ticketModelToDomain(m), nil
}

// Save creates a new ticket record from the domain struct.
func (r *GORMTicketRepository) Save(ctx context.Context, ticket *domain.Ticket) error {
	m := ticketDomainToModel(ticket)
	return r.db.WithContext(ctx).Create(m).Error
}

// Update applies a partial update on the ticket identified by ticket.ID + ticket.TenantID.
func (r *GORMTicketRepository) Update(ctx context.Context, ticket *domain.Ticket, fields map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&models.Ticket{}).
		Where("id = ? AND \"tenantId\" = ?", ticket.ID, ticket.TenantID).
		Updates(fields).Error
}

// --- Mapping helpers ---

func ticketModelToDomain(m *models.Ticket) *domain.Ticket {
	return &domain.Ticket{
		ID:             m.ID,
		Status:         m.Status,
		LastMessage:    m.LastMessage,
		ContactID:      m.ContactID,
		UserID:         m.UserID,
		WhatsappID:     m.WhatsappID,
		IsGroup:        m.IsGroup,
		UnreadMessages: m.UnreadMessages,
		QueueID:        m.QueueID,
		TenantID:       m.TenantID,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}
}

func ticketDomainToModel(d *domain.Ticket) *models.Ticket {
	return &models.Ticket{
		ID:             d.ID,
		Status:         d.Status,
		LastMessage:    d.LastMessage,
		ContactID:      d.ContactID,
		UserID:         d.UserID,
		WhatsappID:     d.WhatsappID,
		IsGroup:        d.IsGroup,
		UnreadMessages: d.UnreadMessages,
		QueueID:        d.QueueID,
		TenantID:       d.TenantID,
		CreatedAt:      d.CreatedAt,
		UpdatedAt:      d.UpdatedAt,
	}
}
