package repository

import (
	"context"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"gorm.io/gorm"
)

var _ domain.VersionRepository = (*GORMVersionRepository)(nil)

type GORMVersionRepository struct {
	db *gorm.DB
}

func NewGORMVersionRepo(db *gorm.DB) *GORMVersionRepository {
	return &GORMVersionRepository{db: db}
}

func (r *GORMVersionRepository) GetPostgresVersion(ctx context.Context) (string, error) {
	var version string
	if err := r.db.WithContext(ctx).Raw("SELECT version()").Scan(&version).Error; err != nil {
		return "", err
	}
	return version, nil
}
