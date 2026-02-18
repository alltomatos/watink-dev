package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
)

func ListQuickAnswers(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var quickAnswers []models.QuickAnswer
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Order("shortcut ASC").Find(&quickAnswers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quick answers"})
		return
	}

	c.JSON(http.StatusOK, quickAnswers)
}

func ShowQuickAnswer(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("quickAnswerId")

	var quickAnswer models.QuickAnswer
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&quickAnswer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quick answer not found"})
		return
	}

	c.JSON(http.StatusOK, quickAnswer)
}
