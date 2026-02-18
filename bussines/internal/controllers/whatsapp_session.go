package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/alltomatos/watinkdev/bussines/internal/services"
	"github.com/gin-gonic/gin"
)

func StartSession(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	whatsappID := c.Param("whatsappId")

	var whatsapp models.Whatsapp
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", whatsappID, tenantID).First(&whatsapp).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found"})
		return
	}

	var req struct {
		UsePairingCode bool   `json:"usePairingCode"`
		PhoneNumber    string `json:"phoneNumber"`
	}
	_ = c.ShouldBindJSON(&req)

	if err := services.StartWhatsAppSession(whatsapp, req.UsePairingCode, req.PhoneNumber, true); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Starting session."})
}

func StopSession(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	whatsappID := c.Param("whatsappId")

	var whatsapp models.Whatsapp
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", whatsappID, tenantID).First(&whatsapp).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found"})
		return
	}

	if err := services.StopWhatsAppSession(whatsapp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stop session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session disconnected."})
}

func RestartAllSessions(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var whatsapps []models.Whatsapp
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Find(&whatsapps).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch WhatsApp connections"})
		return
	}

	for _, whatsapp := range whatsapps {
		_ = services.StartWhatsAppSession(whatsapp, false, "", true)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Restarting all sessions."})
}
