package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListFlows(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var flows []models.Flow
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Find(&flows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch flows"})
		return
	}

	c.JSON(http.StatusOK, flows)
}

func CreateFlow(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var flow models.Flow
	if err := c.ShouldBindJSON(&flow); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	flow.TenantID = tenantID.(uuid.UUID)
	if err := database.DB.Create(&flow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create flow"})
		return
	}

	c.JSON(http.StatusOK, flow)
}
