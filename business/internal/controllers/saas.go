package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ListTenants returns all tenants.
// Route is guarded by SuperAdminOnly middleware — only superadmins reach this handler.
func ListTenants(c *gin.Context) {
	var tenants []models.Tenant
	if err := auth.GetDB(c).Find(&tenants).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListTenants")
		return
	}
	c.JSON(http.StatusOK, tenants)
}

// GetTenantPlan returns a single tenant by ID.
// Route is guarded by SuperAdminOnly middleware.
func GetTenantPlan(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("tenantId"))
	if err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	var tenant models.Tenant
	if err := auth.GetDB(c).Where("id = ?", tenantID).First(&tenant).Error; err != nil {
		utils.RespondWithInternalError(c, err, "GetTenantPlan")
		return
	}

	c.JSON(http.StatusOK, tenant)
}

// ListPlans returns all plans.
// Route is guarded by SuperAdminOnly middleware.
func ListPlans(c *gin.Context) {
	var plans []models.Plan
	if err := auth.GetDB(c).Find(&plans).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListPlans")
		return
	}
	c.JSON(http.StatusOK, plans)
}

// CreatePlan creates a new plan. Route is guarded by SuperAdminOnly middleware.
func CreatePlan(c *gin.Context) {
	var plan models.Plan
	if err := c.ShouldBindJSON(&plan); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if err := auth.GetDB(c).Create(&plan).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreatePlan")
		return
	}

	c.JSON(http.StatusOK, plan)
}
