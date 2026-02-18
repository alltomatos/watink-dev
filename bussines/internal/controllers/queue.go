package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
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
