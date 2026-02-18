package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/alltomatos/watinkdev/backend-go/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListSettings(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var settings []models.Setting
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func GetPublicSettings(c *gin.Context) {
	var settings []models.Setting
	publicKeys := []string{"systemLogo", "login_backgroundImage", "login_layout", "systemFavicon"}

	if err := database.DB.Where("key IN ?", publicKeys).Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch public settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

func UpdateSetting(c *gin.Context) {
	tenantIDRaw, exists := c.Get("tenantId")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantId is required"})
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

	var tenantUUID uuid.UUID
	switch v := tenantIDRaw.(type) {
	case uuid.UUID:
		tenantUUID = v
	case string:
		parsed, err := uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
			return
		}
		tenantUUID = parsed
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID type"})
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
