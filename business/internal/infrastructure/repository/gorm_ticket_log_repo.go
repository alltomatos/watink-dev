package repository

import (
	"context"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"gorm.io/gorm"
)

type GormTicketLogRepository struct {
	db *gorm.DB
}

func NewGormTicketLogRepository(db *gorm.DB) *GormTicketLogRepository {
	return &GormTicketLogRepository{db: db}
}

var _ domain.TicketLogRepository = (*GormTicketLogRepository)(nil)

func (r *GormTicketLogRepository) Create(ctx context.Context, log *models.TicketLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}
