package controllers

import (
	"net/http"
	"path/filepath"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

// KnowledgeBaseController encapsulates knowledge base operations with RLS-scoped DB from auth middleware.
// All queries are automatically tenant-scoped via auth.GetDB(c).
type KnowledgeBaseController struct{}

func NewKnowledgeBaseController() *KnowledgeBaseController {
	return &KnowledgeBaseController{}
}

func (kbc *KnowledgeBaseController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}

	var knowledgeBases []models.KnowledgeBase
	if err := db.Where("\"tenantId\" = ?", tenantID).Find(&knowledgeBases).Error; err != nil {
		utils.RespondWithInternalError(c, err, "Failed to fetch knowledge bases")
		return
	}

	c.JSON(http.StatusOK, knowledgeBases)
}

func (kbc *KnowledgeBaseController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}
	id := c.Param("knowledgeBaseId")

	var knowledgeBase models.KnowledgeBase
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Preload("Sources").First(&knowledgeBase).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Knowledge base not found"})
		return
	}

	c.JSON(http.StatusOK, knowledgeBase)
}

type createKnowledgeBaseInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (kbc *KnowledgeBaseController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}

	var input createKnowledgeBaseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	kb := models.KnowledgeBase{
		Name:        input.Name,
		Description: input.Description,
		TenantID:    tenantID,
	}
	if err := db.Create(&kb).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateKnowledgeBase")
		return
	}

	c.JSON(http.StatusOK, kb)
}

type updateKnowledgeBaseInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (kbc *KnowledgeBaseController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}
	id := c.Param("knowledgeBaseId")

	var kb models.KnowledgeBase
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&kb).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Knowledge base not found"})
		return
	}

	var input updateKnowledgeBaseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	kb.Name = input.Name
	kb.Description = input.Description

	if err := db.Where("\"tenantId\" = ?", tenantID).Save(&kb).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateKnowledgeBase")
		return
	}

	c.JSON(http.StatusOK, kb)
}

func (kbc *KnowledgeBaseController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}
	id := c.Param("knowledgeBaseId")

	result := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.KnowledgeBase{})
	if result.Error != nil {
		utils.RespondWithInternalError(c, result.Error, "DeleteKnowledgeBase")
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Knowledge base not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Knowledge base deleted"})
}

func (kbc *KnowledgeBaseController) CreateSource(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}
	knowledgeBaseID := c.Param("knowledgeBaseId")

	var kb models.KnowledgeBase
	if err := db.Where("id = ? AND \"tenantId\" = ?", knowledgeBaseID, tenantID).First(&kb).Error; err != nil {
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

	if err := db.Create(&source).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateKnowledgeBaseSource")
		return
	}

	c.JSON(http.StatusOK, source)
}

func (kbc *KnowledgeBaseController) DeleteSource(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}
	knowledgeBaseID := c.Param("knowledgeBaseId")
	sourceID := c.Param("sourceId")

	var source models.KnowledgeBaseSource
	if err := db.Where("id = ? AND \"knowledgeBaseId\" = ? AND \"tenantId\" = ?", sourceID, knowledgeBaseID, tenantID).First(&source).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Source not found"})
		return
	}

	if err := db.Delete(&source).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DeleteKnowledgeBaseSource")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Source deleted"})
}
