package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/database"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/gin-gonic/gin"
)

func ListSettings(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var settings []models.Setting
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func GetPublicSettings(c *gin.Context) {
	var tenant models.Tenant
	if err := database.DB.Order("id ASC").First(&tenant).Error; err != nil {
		c.JSON(http.StatusOK, []models.Setting{})
		return
	}

	var settings []models.Setting
	publicKeys := []string{"systemLogo", "login_backgroundImage", "login_layout", "systemFavicon"}

	if err := database.DB.Where("key IN ? AND \"tenantId\" = ?", publicKeys, tenant.ID).Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch public settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func UpdateSetting(c *gin.Context) {
	tenantUUID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	key := c.Param("key")

	var req struct {
		Value string `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	setting := models.Setting{
		Key:      key,
		TenantID: tenantUUID,
		Value:    req.Value,
	}

	if err := database.DB.Where("key = ? AND \"tenantId\" = ?", key, tenantUUID).Assign(models.Setting{Value: req.Value}).FirstOrCreate(&setting).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting"})
		return
	}

	// Real-time broadcast
	services.EmitToNamespace("/", "settings", map[string]interface{}{
		"action":  "update",
		"setting": setting,
	})

	c.JSON(http.StatusOK, setting)
}
