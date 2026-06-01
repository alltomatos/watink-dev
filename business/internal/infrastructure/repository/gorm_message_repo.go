package repository

import (
	"context"
	"errors"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Compile-time interface check.
var _ domain.MessageRepository = (*GORMMessageRepository)(nil)

// GORMMessageRepository implements domain.MessageRepository using GORM.
type GORMMessageRepository struct {
	db *gorm.DB
}

// NewGORMMessageRepo constructs a GORMMessageRepository.
func NewGORMMessageRepo(db *gorm.DB) *GORMMessageRepository {
	return &GORMMessageRepository{db: db}
}

// MessageRepository interface implementation

// Create inserts a new message record from the domain struct.
func (r *GORMMessageRepository) Create(ctx context.Context, msg *domain.Message) error {
	m := messageDomainToModel(msg)
	return r.db.WithContext(ctx).Create(m).Error
}

// CreateIfNotExists inserts a message only if it doesn't already exist.
func (r *GORMMessageRepository) CreateIfNotExists(ctx context.Context, msg *domain.Message) error {
	m := messageDomainToModel(msg)
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(m).Error
}

// FindByID returns the message with the given id under tenantID, or nil if not found.
func (r *GORMMessageRepository) FindByID(ctx context.Context, id string, tenantID uuid.UUID) (*domain.Message, error) {
	var m models.Message
	err := r.db.WithContext(ctx).
		Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return messageModelToDomain(&m), nil
}

// ExistsByID checks if a message with the given id exists under tenantID.
func (r *GORMMessageRepository) ExistsByID(ctx context.Context, id string, tenantID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// Update applies a partial update on the message identified by msg.ID + msg.TenantID.
func (r *GORMMessageRepository) Update(ctx context.Context, msg *domain.Message, fields map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("id = ? AND \"tenantId\" = ?", msg.ID, msg.TenantID).
		Updates(fields).Error
}

// --- Mapping helpers ---

func messageModelToDomain(m *models.Message) *domain.Message {
	return &domain.Message{
		ID:          m.ID,
		Body:        m.Body,
		Ack:         m.Ack,
		Read:        m.Read,
		MediaType:   m.MediaType,
		MediaUrl:    m.MediaUrl,
		TicketID:    m.TicketID,
		FromMe:      m.FromMe,
		IsDeleted:   m.IsDeleted,
		ContactID:   m.ContactID,
		QuotedMsgID: m.QuotedMsgID,
		TenantID:    m.TenantID,
		Reactions:   m.Reactions,
		DataJson:    m.DataJson,
		Participant: m.Participant,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func messageDomainToModel(d *domain.Message) *models.Message {
	return &models.Message{
		ID:          d.ID,
		Body:        d.Body,
		Ack:         d.Ack,
		Read:        d.Read,
		MediaType:   d.MediaType,
		MediaUrl:    d.MediaUrl,
		TicketID:    d.TicketID,
		FromMe:      d.FromMe,
		IsDeleted:   d.IsDeleted,
		ContactID:   d.ContactID,
		QuotedMsgID: d.QuotedMsgID,
		TenantID:    d.TenantID,
		Reactions:   d.Reactions,
		DataJson:    d.DataJson,
		Participant: d.Participant,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}
