package controllers

import (
	"net/http"
	"path/filepath"

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
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Preload("Sources").First(&knowledgeBase).Error; err != nil {
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

func CreateKnowledgeBaseSource(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	knowledgeBaseID := c.Param("knowledgeBaseId")

	var kb models.KnowledgeBase
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", knowledgeBaseID, tenantID).First(&kb).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Knowledge base not found"})
		return
	}

	sourceType := c.PostForm("type")
	urlValue := c.PostForm("url")
	name := c.PostForm("name")
	if sourceType == "" {
		sourceType = "url"
	}

	if file, err := c.FormFile("file"); err == nil && file != nil {
		name = file.Filename
		if sourceType == "" || sourceType == "file" {
			sourceType = filepath.Ext(file.Filename)
		}
	}

	source := models.KnowledgeBaseSource{
		KnowledgeBaseID: kb.ID,
		TenantID:        kb.TenantID,
		Type:            sourceType,
		URL:             urlValue,
		FileName:        name,
		Status:          "ready",
	}

	if err := database.DB.Create(&source).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create source"})
		return
	}

	c.JSON(http.StatusOK, source)
}

func DeleteKnowledgeBaseSource(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	knowledgeBaseID := c.Param("knowledgeBaseId")
	sourceID := c.Param("sourceId")

	var source models.KnowledgeBaseSource
	if err := database.DB.Where("id = ? AND \"knowledgeBaseId\" = ? AND \"tenantId\" = ?", sourceID, knowledgeBaseID, tenantID).First(&source).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Source not found"})
		return
	}

	if err := database.DB.Delete(&source).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete source"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Source deleted"})
}
