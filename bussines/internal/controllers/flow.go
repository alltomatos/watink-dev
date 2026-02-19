package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/gin-gonic/gin"
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
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var flow models.Flow
	if err := c.ShouldBindJSON(&flow); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	flow.TenantID = tenantID
	if err := database.DB.Create(&flow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create flow"})
		return
	}

	c.JSON(http.StatusOK, flow)
}

func ShowFlow(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("flowId")

	var flow models.Flow
	if err := database.DB.Where("\"tenantId\" = ? AND id = ?", tenantID, id).First(&flow).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}

	c.JSON(http.StatusOK, flow)
}

func UpdateFlow(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("flowId")

	var flow models.Flow
	if err := database.DB.Where("\"tenantId\" = ? AND id = ?", tenantID, id).First(&flow).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}

	if err := c.ShouldBindJSON(&flow); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Save(&flow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update flow"})
		return
	}

	c.JSON(http.StatusOK, flow)
}

func DeleteFlow(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("flowId")

	if err := database.DB.Where("\"tenantId\" = ? AND id = ?", tenantID, id).Delete(&models.Flow{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete flow"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Flow deleted successfully"})
}
