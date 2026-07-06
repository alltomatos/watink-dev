package controllers

import (
	"encoding/json"
	"log"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/mediastore"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Update — PUT /protocols/:protocolId (multipart/form-data). Aplica status,
// prioridade, comentário e anexos; registra as transições no histórico e seta
// resolvedAt/closedAt na mudança de status.
func (pc *ProtocolController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}
	id := c.Param("protocolId")

	var protocol models.Protocol
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&protocol).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "protocol not found"})
		return
	}

	prevStatus := protocol.Status
	prevPriority := protocol.Priority
	newStatus := c.PostForm("status")
	newPriority := c.PostForm("priority")
	comment := c.PostForm("comment")

	var userIDPtr *int
	if uid, ok := currentUserID(c); ok {
		userIDPtr = &uid
	}

	updates := map[string]interface{}{"updatedAt": time.Now()}
	if newStatus != "" {
		updates["status"] = newStatus
	}
	if newPriority != "" {
		updates["priority"] = newPriority
	}
	if v := c.PostForm("subject"); v != "" {
		updates["subject"] = v
	}
	if _, has := c.GetPostForm("description"); has {
		updates["description"] = c.PostForm("description")
	}
	if _, has := c.GetPostForm("category"); has {
		updates["category"] = c.PostForm("category")
	}

	statusChanged := newStatus != "" && newStatus != prevStatus
	if statusChanged {
		now := time.Now()
		if newStatus == "resolved" {
			updates["resolvedAt"] = now
		} else if newStatus == "closed" {
			updates["closedAt"] = now
		}
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Protocol{}).
		Where("id = ? AND \"tenantId\" = ?", protocol.ID, tenantID).
		Updates(updates).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateProtocol")
		return
	}

	if statusChanged {
		msg := comment
		if msg == "" {
			msg = "Status alterado de " + prevStatus + " para " + newStatus
		}
		addProtocolHistory(db, tenantID, protocol.ID, userIDPtr, "status_changed", prevStatus, newStatus, msg, "")
	}
	if newPriority != "" && newPriority != prevPriority {
		addProtocolHistory(db, tenantID, protocol.ID, userIDPtr, "priority_changed", prevPriority, newPriority, "", "")
	}
	if comment != "" && !statusChanged {
		addProtocolHistory(db, tenantID, protocol.ID, userIDPtr, "comment_added", "", "", comment, "")
	}

	if form, err := c.MultipartForm(); err == nil && form != nil {
		if files := form.File["files"]; len(files) > 0 {
			pc.saveProtocolAttachments(db, tenantID, protocol.ID, userIDPtr, files)
		}
	}

	var updated models.Protocol
	db.Session(&gorm.Session{NewDB: true}).
		Preload("Contact.Client").
		Preload("History", func(d *gorm.DB) *gorm.DB { return d.Order("\"createdAt\" DESC") }).
		Preload("History.User").
		Where("id = ? AND \"tenantId\" = ?", protocol.ID, tenantID).First(&updated)

	pc.broadcastProtocolEvent(tenantID, "update", &updated, prevStatus, updated.Status)
	c.JSON(http.StatusOK, updated)
}

// saveProtocolAttachments persiste os arquivos (via mediastore, dedup por hash) e
// registra UMA linha de histórico "attachment" com o JSON dos arquivos (a
// timeline pública lê `changes.files`). Retorna os anexos criados.
func (pc *ProtocolController) saveProtocolAttachments(db *gorm.DB, tenantID uuid.UUID, protocolID int, userID *int, files []*multipart.FileHeader) []models.ProtocolAttachment {
	created := make([]models.ProtocolAttachment, 0, len(files))
	writeDB := db.Session(&gorm.Session{NewDB: true})

	for _, fh := range files {
		f, err := fh.Open()
		if err != nil {
			log.Printf("[Protocol] open upload failed (%s): %v", fh.Filename, err)
			continue
		}
		mimeType := fh.Header.Get("Content-Type")
		savedURL, err := mediastore.SaveMediaReader(f, mimeType)
		_ = f.Close()
		if err != nil || savedURL == "" {
			log.Printf("[Protocol] save upload failed (%s): %v", fh.Filename, err)
			continue
		}
		att := models.ProtocolAttachment{
			ProtocolID:   protocolID,
			FileName:     filepath.Base(savedURL),
			OriginalName: fh.Filename,
			FilePath:     savedURL,
			FileType:     mimeType,
			FileSize:     fh.Size,
			UploadedBy:   userID,
			TenantID:     tenantID,
		}
		if err := writeDB.Create(&att).Error; err != nil {
			log.Printf("[Protocol] persist attachment failed (%s): %v", fh.Filename, err)
			continue
		}
		created = append(created, att)
	}

	if len(created) > 0 {
		type fileMeta struct {
			ID           int    `json:"id"`
			FilePath     string `json:"filePath"`
			OriginalName string `json:"originalName"`
			FileType     string `json:"fileType"`
			FileSize     int64  `json:"size"`
		}
		metas := make([]fileMeta, 0, len(created))
		for _, a := range created {
			metas = append(metas, fileMeta{a.ID, a.FilePath, a.OriginalName, a.FileType, a.FileSize})
		}
		changesJSON, _ := json.Marshal(map[string]interface{}{"files": metas})
		addProtocolHistory(db, tenantID, protocolID, userID, "attachment", "", "", "Anexos adicionados", string(changesJSON))
	}
	return created
}

// ListAttachments — GET /protocols/:protocolId/attachments.
func (pc *ProtocolController) ListAttachments(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}
	protocolID := c.Param("protocolId")
	var attachments []models.ProtocolAttachment
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where("\"protocolId\" = ? AND \"tenantId\" = ?", protocolID, tenantID).
		Order("\"createdAt\" DESC").Find(&attachments).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListProtocolAttachments")
		return
	}
	c.JSON(http.StatusOK, attachments)
}

// StoreAttachments — POST /protocols/:protocolId/attachments (multipart, campo
// "files"). Retorna os anexos criados.
func (pc *ProtocolController) StoreAttachments(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}
	protocolID, err := strconv.Atoi(c.Param("protocolId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid protocolId"})
		return
	}
	var protocol models.Protocol
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where("id = ? AND \"tenantId\" = ?", protocolID, tenantID).First(&protocol).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "protocol not found"})
		return
	}
	form, err := c.MultipartForm()
	if err != nil || form == nil || len(form.File["files"]) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no files provided"})
		return
	}
	var userIDPtr *int
	if uid, ok := currentUserID(c); ok {
		userIDPtr = &uid
	}
	created := pc.saveProtocolAttachments(db, tenantID, protocolID, userIDPtr, form.File["files"])
	c.JSON(http.StatusCreated, created)
}

// DeleteAttachment — DELETE /protocols/:protocolId/attachments/:attachmentId.
// Remove apenas a linha (o arquivo físico é deduplicado por hash e pode ser
// compartilhado com mensagens do chat — não é apagado do disco).
func (pc *ProtocolController) DeleteAttachment(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}
	protocolID := c.Param("protocolId")
	attachmentID := c.Param("attachmentId")

	res := db.Session(&gorm.Session{NewDB: true}).
		Where("id = ? AND \"protocolId\" = ? AND \"tenantId\" = ?", attachmentID, protocolID, tenantID).
		Delete(&models.ProtocolAttachment{})
	if res.Error != nil {
		utils.RespondWithInternalError(c, res.Error, "DeleteProtocolAttachment")
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "attachment not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Anexo removido com sucesso"})
}
