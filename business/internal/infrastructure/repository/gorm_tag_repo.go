package repository

import (
	"context"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GORMTagRepository struct {
	db *gorm.DB
}

func NewGORMTagRepository(db *gorm.DB) *GORMTagRepository {
	return &GORMTagRepository{db: db}
}

var _ domain.TagRepository = (*GORMTagRepository)(nil)

// FindOrCreateByName returns the tag with the given name for the tenant,
// creating it with a green color if it does not exist.
func (r *GORMTagRepository) FindOrCreateByName(ctx context.Context, tenantID uuid.UUID, name string) (*models.Tag, error) {
	var tag models.Tag
	err := r.db.WithContext(ctx).
		Where(`"tenantId" = ? AND name = ?`, tenantID, name).
		First(&tag).Error

	if err == nil {
		return &tag, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	now := time.Now()
	tag = models.Tag{
		Name:      name,
		Color:     "green",
		TenantID:  tenantID,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := r.db.WithContext(ctx).Create(&tag).Error; err != nil {
		return nil, err
	}
	return &tag, nil
}
