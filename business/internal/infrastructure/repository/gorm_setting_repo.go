package repository

import (
	"context"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"gorm.io/gorm"
)

var _ domain.SettingRepository = (*GORMSettingRepository)(nil)

type GORMSettingRepository struct {
	db *gorm.DB
}

func NewGORMSettingRepo(db *gorm.DB) *GORMSettingRepository {
	return &GORMSettingRepository{db: db}
}

// FindPublicSettings returns branding keys for the first tenant.
// Runs before auth (login page) so it uses a root (non-RLS) DB connection.
func (r *GORMSettingRepository) FindPublicSettings(ctx context.Context, keys []string) ([]models.Setting, error) {
	var tenant models.Tenant
	if err := r.db.WithContext(ctx).Order("id ASC").First(&tenant).Error; err != nil {
		return []models.Setting{}, nil
	}

	var settings []models.Setting
	if err := r.db.WithContext(ctx).
		Where("key IN ? AND \"tenantId\" = ?", keys, tenant.ID).
		Find(&settings).Error; err != nil {
		return nil, err
	}
	return settings, nil
}
