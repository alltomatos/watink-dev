package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/database"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func ListQueues(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var queues []models.Queue
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).
		Preload("Whatsapps").
		Order("COALESCE(\"parentId\", id), \"parentId\" IS NOT NULL, name ASC").
		Find(&queues).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch queues"})
		return
	}

	c.JSON(http.StatusOK, queues)
}

func ShowQueue(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("queueId")

	var queue models.Queue
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		Preload("Whatsapps").
		First(&queue).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Queue not found"})
		return
	}

	c.JSON(http.StatusOK, queue)
}

func CreateQueue(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	// SaaS Limit Check
	limitService := services.NewPlanLimitService()
	if err := limitService.CheckLimit(tenantID, "queues"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	var input struct {
		models.Queue
		WhatsappIds []int `json:"whatsappIds"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	queue := input.Queue
	queue.TenantID = tenantID

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&queue).Error; err != nil {
			return err
		}

		if len(input.WhatsappIds) > 0 {
			var whatsapps []models.Whatsapp
			if err := tx.Where("id IN ? AND \"tenantId\" = ?", input.WhatsappIds, tenantID).Find(&whatsapps).Error; err != nil {
				return err
			}
			if err := tx.Model(&queue).Association("Whatsapps").Replace(&whatsapps); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create queue"})
		return
	}

	services.EmitToNamespace("/", "queue", gin.H{"action": "create", "queue": queue})

	c.JSON(http.StatusOK, queue)
}

func UpdateQueue(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("queueId")

	var queue models.Queue
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&queue).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Queue not found"})
		return
	}

	var input struct {
		models.Queue
		WhatsappIds []int `json:"whatsappIds"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Update basic fields
		if err := tx.Model(&queue).Updates(input.Queue).Error; err != nil {
			return err
		}

		// Update Whatsapps association
		var whatsapps []models.Whatsapp
		if len(input.WhatsappIds) > 0 {
			if err := tx.Where("id IN ? AND \"tenantId\" = ?", input.WhatsappIds, tenantID).Find(&whatsapps).Error; err != nil {
				return err
			}
		}
		if err := tx.Model(&queue).Association("Whatsapps").Replace(&whatsapps); err != nil {
			return err
		}

		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update queue"})
		return
	}

	services.EmitToNamespace("/", "queue", gin.H{"action": "update", "queue": queue})

	c.JSON(http.StatusOK, queue)
}

func DeleteQueue(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("queueId")

	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.Queue{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete queue"})
		return
	}

	services.EmitToNamespace("/", "queue", gin.H{"action": "delete", "queueId": id})

	c.JSON(http.StatusOK, gin.H{"message": "Queue deleted successfully"})
}
