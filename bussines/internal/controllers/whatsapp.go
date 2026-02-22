package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/alltomatos/watinkdev/bussines/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	// SaaS Limit Check
	limitService := services.NewPlanLimitService()
	if err := limitService.CheckLimit(tenantID, "connections"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	var input models.Whatsapp
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.TenantID = tenantID
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
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
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
	input.TenantID = tenantID

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

	var whatsapp models.Whatsapp
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&whatsapp).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found"})
		return
	}

	// 1. Stop session if active
	_ = services.StopWhatsAppSession(whatsapp)

	// 2. Clear related data using a transaction
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Set whatsappId to null in Tickets
		if err := tx.Model(&models.Ticket{}).Where("\"whatsappId\" = ?", id).Update("whatsappId", nil).Error; err != nil {
			return err
		}

		// Set whatsappId to null in Users
		if err := tx.Model(&models.User{}).Where("\"whatsappId\" = ?", id).Update("whatsappId", nil).Error; err != nil {
			return err
		}

		// Set whatsappId to null in Flows
		if err := tx.Model(&models.Flow{}).Where("\"whatsappId\" = ?", id).Update("whatsappId", nil).Error; err != nil {
			return err
		}

		// Delete associations in WhatsappQueues (many2many)
		// We use the raw table name since there might not be a model for it
		if err := tx.Exec("DELETE FROM \"WhatsappQueues\" WHERE \"whatsappId\" = ?", id).Error; err != nil {
			return err
		}

		// Finally delete the WhatsApp connection
		if err := tx.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.Whatsapp{}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to delete connection: " + err.Error()})
		return
	}

	// Notify via socket
	services.EmitToNamespace("/", "whatsapp", gin.H{
		"action":     "delete",
		"whatsappId": whatsapp.ID,
	})

	c.JSON(http.StatusOK, gin.H{"message": "WhatsApp connection deleted"})
}
