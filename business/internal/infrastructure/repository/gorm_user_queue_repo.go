package repository

import (
	"context"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GormUserQueueRepository struct {
	db *gorm.DB
}

func NewGormUserQueueRepository(db *gorm.DB) *GormUserQueueRepository {
	return &GormUserQueueRepository{db: db}
}

var _ domain.UserQueueRepository = (*GormUserQueueRepository)(nil)

func (r *GormUserQueueRepository) IsUserInQueue(ctx context.Context, userID int, queueID int) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Table("user_queues").
		Where(`user_id = ? AND queue_id = ?`, userID, queueID).
		Count(&count).Error
	return count > 0, err
}

func (r *GormUserQueueRepository) FindQueueUsers(ctx context.Context, queueID int, tenantID uuid.UUID) ([]domain.User, error) {
	var rows []models.User
	err := r.db.WithContext(ctx).
		Joins(`JOIN user_queues uq ON uq.user_id = "Users".id`).
		Where(`uq.queue_id = ? AND "Users"."tenantId" = ?`, queueID, tenantID).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	users := make([]domain.User, len(rows))
	for i, m := range rows {
		users[i] = domain.User{ID: m.ID, Name: m.Name, Email: m.Email, TenantID: m.TenantID}
	}
	return users, nil
}
