package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
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
