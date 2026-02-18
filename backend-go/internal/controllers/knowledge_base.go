package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListKnowledgeBases(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var knowledgeBases []models.KnowledgeBase
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Find(&knowledgeBases).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch knowledge bases"})
		return
	}

	c.JSON(http.StatusOK, knowledgeBases)
}

func ShowKnowledgeBase(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("knowledgeBaseId")

	var knowledgeBase models.KnowledgeBase
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&knowledgeBase).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Knowledge base not found"})
		return
	}

	c.JSON(http.StatusOK, knowledgeBase)
}

func CreateKnowledgeBase(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var knowledgeBase models.KnowledgeBase
	if err := c.ShouldBindJSON(&knowledgeBase); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	knowledgeBase.TenantID = tenantID.(uuid.UUID)
	if err := database.DB.Create(&knowledgeBase).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create knowledge base"})
		return
	}

	c.JSON(http.StatusOK, knowledgeBase)
}

func UpdateKnowledgeBase(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("knowledgeBaseId")

	var knowledgeBase models.KnowledgeBase
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&knowledgeBase).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Knowledge base not found"})
		return
	}

	var payload models.KnowledgeBase
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	knowledgeBase.Name = payload.Name
	knowledgeBase.Description = payload.Description

	if err := database.DB.Save(&knowledgeBase).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update knowledge base"})
		return
	}

	c.JSON(http.StatusOK, knowledgeBase)
}

func DeleteKnowledgeBase(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("knowledgeBaseId")

	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.KnowledgeBase{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete knowledge base"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Knowledge base deleted"})
}
