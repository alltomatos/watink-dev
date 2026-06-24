package controllers

import (
	"net/http"
	"path/filepath"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

type createKnowledgeBaseInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// @Summary      Criar base de conhecimento
// @Tags         knowledge-base
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados da base"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /knowledge-bases [post]
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

	name, err := utils.ValidateStringField(input.Name, "name", 255)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	description, err := utils.ValidateStringField(input.Description, "description", 1000)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	kb := models.KnowledgeBase{
		Name:        name,
		Description: description,
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

// @Summary      Atualizar base de conhecimento
// @Tags         knowledge-base
// @Accept       json
// @Produce      json
// @Param        knowledgeBaseId  path      int                     true  "ID da base"
// @Param        body             body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200              {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /knowledge-bases/{knowledgeBaseId} [put]
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

	updName, err := utils.ValidateStringField(input.Name, "name", 255)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updDesc, err := utils.ValidateStringField(input.Description, "description", 1000)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	kb.Name = updName
	kb.Description = updDesc

	if err := db.Where("\"tenantId\" = ?", tenantID).Save(&kb).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateKnowledgeBase")
		return
	}

	c.JSON(http.StatusOK, kb)
}

// @Summary      Remover base de conhecimento
// @Tags         knowledge-base
// @Produce      json
// @Param        knowledgeBaseId  path      int  true  "ID da base"
// @Success      200              {object}  map[string]string
// @Security     BearerAuth
// @Router       /knowledge-bases/{knowledgeBaseId} [delete]
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

// @Summary      Adicionar fonte na base
// @Tags         knowledge-base
// @Accept       json
// @Produce      json
// @Param        knowledgeBaseId  path      int                     true  "ID da base"
// @Param        body             body      map[string]interface{}  true  "Dados da fonte"
// @Success      200              {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /knowledge-bases/{knowledgeBaseId}/sources [post]
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
	sourceName := c.PostForm("name")

	if file, err := c.FormFile("file"); err == nil && file != nil {
		sourceName = filepath.Base(file.Filename)
		if sourceType == "" || sourceType == "file" {
			ext := filepath.Ext(file.Filename)
			if len(ext) > 1 {
				sourceType = strings.ToLower(strings.TrimPrefix(ext, "."))
			} else {
				sourceType = "file"
			}
		}
	}

	validSourceTypes := map[string]bool{
		"url": true, "file": true, "pdf": true, "txt": true,
		"docx": true, "csv": true, "xlsx": true, "md": true,
	}
	if sourceType == "" {
		sourceType = "url"
	}
	if !validSourceTypes[sourceType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sourceType: must be one of url, file, pdf, txt, docx, csv, xlsx, md"})
		return
	}

	if _, err := utils.ValidateStringField(urlValue, "url", 2048); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(sourceName, "name", 255); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	source := models.KnowledgeBaseSource{
		KnowledgeBaseID: kb.ID,
		TenantID:        kb.TenantID,
		Type:            sourceType,
		URL:             urlValue,
		FileName:        sourceName,
		Status:          "ready",
	}

	if err := db.Create(&source).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateKnowledgeBaseSource")
		return
	}

	c.JSON(http.StatusOK, source)
}

// @Summary      Remover fonte da base
// @Tags         knowledge-base
// @Produce      json
// @Param        knowledgeBaseId  path      int  true  "ID da base"
// @Param        sourceId         path      int  true  "ID da fonte"
// @Success      200              {object}  map[string]string
// @Security     BearerAuth
// @Router       /knowledge-bases/{knowledgeBaseId}/sources/{sourceId} [delete]
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
