package controllers

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
	content := c.PostForm("content")

	var fileHeader *multipart.FileHeader
	if file, err := c.FormFile("file"); err == nil && file != nil {
		fileHeader = file
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
		"docx": true, "csv": true, "xlsx": true, "md": true, "text": true,
	}
	if sourceType == "" {
		sourceType = "url"
	}
	if !validSourceTypes[sourceType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sourceType: must be one of url, file, pdf, txt, docx, csv, xlsx, md, text"})
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

	if sourceType == "text" {
		if _, err := utils.ValidateStringField(content, "content", 100000); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	status := "ready"
	if sourceType == "text" || fileHeader != nil {
		status = "pending"
	}

	source := models.KnowledgeBaseSource{
		KnowledgeBaseID: kb.ID,
		TenantID:        kb.TenantID,
		Type:            sourceType,
		URL:             urlValue,
		FileName:        sourceName,
		Status:          status,
	}

	// Use a fresh session for the write: the earlier db.Where(...).First(&kb) on
	// the scoped db leaves KnowledgeBase as the Statement.Schema, and reusing it
	// for Create(&source) would make GORM build the insert against the wrong
	// schema (auto-time CreatedAt landing on a string column → panic). NewDB
	// re-derives the KnowledgeBaseSource schema. See message_send.go for the
	// same scoped-db reuse caveat.
	if err := db.Session(&gorm.Session{NewDB: true}).Create(&source).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateKnowledgeBaseSource")
		return
	}

	// File sources: persist the uploaded bytes to the object store and dispatch a
	// `file` ingestion job. The worker downloads the object by key, extracts text
	// (pdf/docx/xlsx/csv/txt/md), then follows the same chunk/embed/store path as
	// text. The object key is tenant-prefixed for multitenancy.
	if fileHeader != nil {
		if kbc.store == nil {
			markSourceError(db, &source, "object store não configurado")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "object store não configurado"})
			return
		}

		objectKey := fmt.Sprintf("%s/%d/%d/%s", tenantID.String(), kb.ID, source.ID, source.FileName)

		f, err := fileHeader.Open()
		if err != nil {
			markSourceError(db, &source, "falha ao abrir arquivo enviado")
			utils.RespondWithInternalError(c, err, "CreateKnowledgeBaseSource: open upload")
			return
		}
		defer func() { _ = f.Close() }()

		if err := kbc.store.Upload(c.Request.Context(), objectKey, f, fileHeader.Size, fileHeader.Header.Get("Content-Type")); err != nil {
			markSourceError(db, &source, "falha ao enviar arquivo ao object store")
			utils.RespondWithInternalError(c, err, "CreateKnowledgeBaseSource: upload")
			return
		}

		if err := db.Session(&gorm.Session{NewDB: true}).Model(&source).Update("objectKey", objectKey).Error; err != nil {
			utils.RespondWithInternalError(c, err, "CreateKnowledgeBaseSource: persist objectKey")
			return
		}
		source.ObjectKey = objectKey

		if kbc.publisher != nil {
			_ = kbc.publisher.PublishKnowledgeJob(
				fmt.Sprintf("knowledge.%s.ingest", tenantID.String()),
				map[string]interface{}{
					"tenantId": tenantID.String(), "knowledgeBaseId": kb.ID, "sourceId": source.ID,
					"type": "file", "payload": map[string]interface{}{"objectKey": objectKey, "fileName": source.FileName},
				})
		}

		c.JSON(http.StatusOK, source)
		return
	}

	// For text sources, dispatch an ingestion job to watink-knowledge. The
	// microservice chunks/embeds the text and reports status back via
	// knowledge.events (handled by KnowledgeStatusListener).
	if sourceType == "text" && kbc.publisher != nil {
		_ = kbc.publisher.PublishKnowledgeJob(
			fmt.Sprintf("knowledge.%s.ingest", tenantID.String()),
			map[string]interface{}{
				"tenantId": tenantID.String(), "knowledgeBaseId": kb.ID, "sourceId": source.ID,
				"type": "text", "payload": map[string]interface{}{"text": content},
			})
	}

	c.JSON(http.StatusOK, source)
}

// markSourceError flips a source to the error state with lastError set, using a
// fresh GORM session (the scoped db reuse caveat applies to writes here too).
func markSourceError(db *gorm.DB, source *models.KnowledgeBaseSource, msg string) {
	source.Status = "error"
	source.LastError = msg
	_ = db.Session(&gorm.Session{NewDB: true}).Model(source).
		Updates(map[string]interface{}{"status": "error", "lastError": msg}).Error
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
