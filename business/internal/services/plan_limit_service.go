package services

import (
	"fmt"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PlanLimitService struct {
	db *gorm.DB
}

func NewPlanLimitService(db *gorm.DB) *PlanLimitService {
	return &PlanLimitService{
		db: db,
	}
}

func (s *PlanLimitService) CheckLimit(tenantID uuid.UUID, resource string) error {
	// Core features (users, connections, queues) are free and unlimited.
	if resource == "users" || resource == "connections" || resource == "queues" {
		return nil
	}

	var sub models.TenantSubscription
	if err := s.db.Where("\"tenantId\" = ? AND status = ?", tenantID, "active").
		Preload("Plan").
		First(&sub).Error; err != nil {
		return fmt.Errorf("active subscription required for plugin features")
	}

	plan := sub.Plan

	switch resource {
	case "plugins":
		var count int64
		// Count installed/active plugins for this tenant
		s.db.Table("PluginInstallations").Where("\"tenantId\" = ?", tenantID).Count(&count)
		if int(count) >= plan.PluginQuota && plan.PluginQuota > 0 {
			return fmt.Errorf("plugin quota reached (%d/%d)", count, plan.PluginQuota)
		}
	}

	return nil
}
