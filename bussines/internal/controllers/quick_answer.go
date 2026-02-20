package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
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

func CreateQuickAnswer(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var qa models.QuickAnswer
	if err := c.ShouldBindJSON(&qa); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	qa.TenantID = tenantID
	if err := database.DB.Create(&qa).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create quick answer"})
		return
	}

	c.JSON(http.StatusOK, qa)
}

func UpdateQuickAnswer(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("quickAnswerId")

	var qa models.QuickAnswer
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&qa).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quick answer not found"})
		return
	}

	if err := c.ShouldBindJSON(&qa); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Save(&qa).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update quick answer"})
		return
	}

	c.JSON(http.StatusOK, qa)
}

func DeleteQuickAnswer(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("quickAnswerId")

	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.QuickAnswer{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete quick answer"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Quick answer deleted successfully"})
}
