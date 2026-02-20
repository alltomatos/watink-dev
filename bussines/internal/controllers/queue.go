package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/gin-gonic/gin"
)

func ListQueues(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var queues []models.Queue
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Order("name ASC").Find(&queues).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch queues"})
		return
	}

	c.JSON(http.StatusOK, queues)
}

func ShowQueue(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("queueId")

	var queue models.Queue
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&queue).Error; err != nil {
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

	var queue models.Queue
	if err := c.ShouldBindJSON(&queue); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	queue.TenantID = tenantID
	if err := database.DB.Create(&queue).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create queue"})
		return
	}

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

	if err := c.ShouldBindJSON(&queue); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Save(&queue).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update queue"})
		return
	}

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

	c.JSON(http.StatusOK, gin.H{"message": "Queue deleted successfully"})
}
