package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ListTenants returns all tenants.
// Route is guarded by SuperAdminOnly middleware — only superadmins reach this handler.
func ListTenants(c *gin.Context) {
	var tenants []models.Tenant
	if err := getDB(c).Find(&tenants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tenants"})
		return
	}
	c.JSON(http.StatusOK, tenants)
}

// GetTenantPlan returns a single tenant by ID.
// Route is guarded by SuperAdminOnly middleware.
func GetTenantPlan(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("tenantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var tenant models.Tenant
	if err := getDB(c).Where("id = ?", tenantID).First(&tenant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
		return
	}

	c.JSON(http.StatusOK, tenant)
}

// ListPlans returns all plans.
// Route is guarded by SuperAdminOnly middleware.
func ListPlans(c *gin.Context) {
	var plans []models.Plan
	if err := getDB(c).Find(&plans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plans"})
		return
	}
	c.JSON(http.StatusOK, plans)
}

// CreatePlan creates a new plan. Route is guarded by SuperAdminOnly middleware.
func CreatePlan(c *gin.Context) {
	var plan models.Plan
	if err := c.ShouldBindJSON(&plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := getDB(c).Create(&plan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create plan"})
		return
	}

	c.JSON(http.StatusOK, plan)
}
