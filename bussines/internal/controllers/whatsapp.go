package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListWhatsapps(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var whatsapps []models.Whatsapp
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Find(&whatsapps).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch WhatsApp connections"})
		return
	}

	c.JSON(http.StatusOK, whatsapps)
}

func ShowWhatsapp(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("id")

	var whatsapp models.Whatsapp
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&whatsapp).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found"})
		return
	}

	c.JSON(http.StatusOK, whatsapp)
}

func CreateWhatsapp(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var input models.Whatsapp
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.TenantID = tenantID.(uuid.UUID)
	if input.Status == "" {
		input.Status = "DISCONNECTED"
	}

	if input.IsDefault {
		database.DB.Model(&models.Whatsapp{}).
			Where("\"tenantId\" = ?", input.TenantID).
			Update("isDefault", false)
	}

	if err := database.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, input)
}

func UpdateWhatsapp(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("id")

	var whatsapp models.Whatsapp
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&whatsapp).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found"})
		return
	}

	var input models.Whatsapp
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.IsDefault {
		database.DB.Model(&models.Whatsapp{}).
			Where("\"tenantId\" = ?", tenantID).
			Update("isDefault", false)
	}

	input.ID = whatsapp.ID
	input.TenantID = tenantID.(uuid.UUID)

	if err := database.DB.Model(&whatsapp).Updates(input).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&whatsapp).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found"})
		return
	}

	c.JSON(http.StatusOK, whatsapp)
}

func DeleteWhatsapp(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("id")

	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.Whatsapp{}).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "WhatsApp connection deleted"})
}
