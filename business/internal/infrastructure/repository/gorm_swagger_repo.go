package repository

import (
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var _ domain.SwaggerPermissionRepository = (*GORMSwaggerPermissionRepository)(nil)

type GORMSwaggerPermissionRepository struct {
	db *gorm.DB
}

func NewGORMSwaggerPermissionRepo(db *gorm.DB) *GORMSwaggerPermissionRepository {
	return &GORMSwaggerPermissionRepository{db: db}
}

func (r *GORMSwaggerPermissionRepository) HasSwaggerPermission(userID int, tenantID uuid.UUID) (bool, error) {
	if userID <= 0 {
		return false, nil
	}

	var user models.User
	if err := r.db.Where("id = ? AND \"tenantId\" = ?", userID, tenantID).First(&user).Error; err != nil || user.CargoID == nil {
		return false, nil
	}

	var count int64
	r.db.Table("cargo_permissoes AS cp").
		Joins(`JOIN "Permissions" p ON p.id = cp."permissionId"`).
		Where(`cp."cargoId" = ? AND p.resource = ? AND p.action = ?`,
			*user.CargoID, "swagger", "view").
		Count(&count)

	return count > 0, nil
}
