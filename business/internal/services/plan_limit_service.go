package services

import (
	"fmt"

	"github.com/alltomatos/watinkdev/business/internal/database"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
)

type PlanLimitService struct{}

func NewPlanLimitService() *PlanLimitService {
	return &PlanLimitService{}
}

func (s *PlanLimitService) CheckLimit(tenantID uuid.UUID, resource string) error {
	// Core features (users, connections, queues) are free and unlimited.
	if resource == "users" || resource == "connections" || resource == "queues" {
		return nil
	}

	var sub models.TenantSubscription
	if err := database.DB.Where("\"tenantId\" = ? AND status = ?", tenantID, "active").
		Preload("Plan").
		First(&sub).Error; err != nil {
		return fmt.Errorf("active subscription required for plugin features")
	}

	plan := sub.Plan

	switch resource {
	case "plugins":
		var count int64
		// Count installed/active plugins for this tenant
		database.DB.Table("PluginInstallations").Where("\"tenantId\" = ?", tenantID).Count(&count)
		if int(count) >= plan.PluginQuota && plan.PluginQuota > 0 {
			return fmt.Errorf("plugin quota reached (%d/%d)", count, plan.PluginQuota)
		}
	}

	return nil
}
