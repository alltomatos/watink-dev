package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListPipelines(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var pipelines []models.Pipeline
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Preload("Stages").Find(&pipelines).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch pipelines"})
		return
	}

	c.JSON(http.StatusOK, pipelines)
}

func CreatePipeline(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var pipeline models.Pipeline
	if err := c.ShouldBindJSON(&pipeline); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pipeline.TenantID = tenantID.(uuid.UUID)
	if err := database.DB.Create(&pipeline).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create pipeline"})
		return
	}

	c.JSON(http.StatusOK, pipeline)
}
