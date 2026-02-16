package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
)

func ListMessages(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	ticketID := c.Param("ticketId")

	var messages []models.Message
	if err := database.DB.Where("\"ticketId\" = ? AND \"tenantId\" = ?", ticketID, tenantID).
		Order("\"createdAt\" ASC").
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
	})
}
