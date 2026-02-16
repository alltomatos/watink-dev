package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListSettings(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	
	var settings []models.Setting
	if err := database.DB.Where("tenantId = ?", tenantID).Find(&settings).Error; err != nil {
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
	tenantID, _ := c.Get("tenantId")
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
		TenantID: tenantID.(uuid.UUID),
	}

	if err := database.DB.Model(&setting).Update("value", req.Value).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting"})
		return
	}

	c.JSON(http.StatusOK, setting)
}
