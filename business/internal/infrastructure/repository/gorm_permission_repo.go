package repository

import (
	"context"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"gorm.io/gorm"
)

var _ domain.PermissionRepository = (*GORMPermissionRepository)(nil)

type GORMPermissionRepository struct {
	db *gorm.DB
}

func NewGORMPermissionRepo(db *gorm.DB) *GORMPermissionRepository {
	return &GORMPermissionRepository{db: db}
}

func (r *GORMPermissionRepository) FindAll(ctx context.Context) ([]models.Permission, error) {
	var perms []models.Permission
	if err := r.db.WithContext(ctx).Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}

func (r *GORMPermissionRepository) FindByIDs(ctx context.Context, ids []int) ([]models.Permission, error) {
	var perms []models.Permission
	if err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}
