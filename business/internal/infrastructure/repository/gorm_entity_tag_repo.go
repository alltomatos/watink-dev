package repository

import (
	"context"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GORMEntityTagRepository struct {
	db *gorm.DB
}

func NewGORMEntityTagRepository(db *gorm.DB) *GORMEntityTagRepository {
	return &GORMEntityTagRepository{db: db}
}

var _ domain.EntityTagRepository = (*GORMEntityTagRepository)(nil)

// AddIfAbsent inserts an EntityTag record only when the combination
// (entityType, entityID, tagID, tenantID) does not already exist.
// It is safe to call multiple times — duplicates are silently ignored.
func (r *GORMEntityTagRepository) AddIfAbsent(
	ctx context.Context,
	entityType string,
	entityID int,
	tagID int,
	tenantID uuid.UUID,
) error {
	now := time.Now()
	row := models.EntityTag{
		TagID:      tagID,
		EntityType: entityType,
		EntityID:   entityID,
		TenantID:   tenantID,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&row).Error
}
