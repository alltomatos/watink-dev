package controllers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/mediastore"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

type MessageController struct {
	rabbit domain.CommandPublisher
}

func NewMessageController(r domain.CommandPublisher) *MessageController {
	return &MessageController{rabbit: r}
}

// ListMessages returns all messages for a given ticket.
// @Summary      Listar mensagens do ticket
// @Tags         messages
// @Produce      json
// @Param        ticketId  path      int  true  "ID do ticket"
// @Param        pageNumber query int false "Página"
// @Success      200       {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /messages/{ticketId} [get]
func (mc *MessageController) ListMessages(c *gin.Context) {
	db, _, ok := auth.GetScoped(c, "Messages")
	if !ok {
		return
	}
	ticketID := c.Param("ticketId")

	pageNumber := 1
	if p, err := strconv.Atoi(c.Query("pageNumber")); err == nil && p > 0 {
		pageNumber = p
	}
	pageSize := 20
	offset := (pageNumber - 1) * pageSize

	var messages []models.Message
	if err := db.
		Where("\"ticketId\" = ?", ticketID).
		Order("\"createdAt\" DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&messages).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListMessages")
		return
	}

	// Reverse to chronological order for the client
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	var count int64
	if err := db.Model(&models.Message{}).Where("\"ticketId\" = ?", ticketID).Count(&count).Error; err != nil {
		count = int64(len(messages))
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"count":    count,
		"hasMore":  int64(offset+pageSize) < count,
	})
}

// SendMessage envia uma mensagem via engine WhatsApp.
// Aceita JSON (texto) ou multipart/form-data (mídia com arquivo binário).
//
// @Summary      Enviar mensagem
// @Description  Envia mensagem de texto ou mídia via engine WhatsApp
// @Tags         messages
// @Accept       json
// @Accept       mpfd
// @Produce      json
// @Param        ticketId  path      int     true  "ID do ticket"
// @Param        body      body      object  false "Corpo JSON para texto"
// @Param        medias    formData  file    false "Arquivo de mídia (multipart)"
// @Param        fromMe    formData  string  false "true/false"
// @Success      200       {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /messages/{ticketId} [post]
func (mc *MessageController) SendMessage(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Messages")
	if !ok {
		return
	}

	ticketIDStr := c.Param("ticketId")
	ticketID, err := strconv.Atoi(ticketIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	var ticket models.Ticket
	if err := db.Where("id = ? AND \"tenantId\" = ?", ticketID, tenantID).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	ct := c.ContentType()
	var body, mediaType, mediaURL string

	if ct == "application/json" || ct == "" {
		var input struct {
			Body      string `json:"body"`
			MediaType string `json:"mediaType"`
			MediaUrl  string `json:"mediaUrl"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			utils.RespondWithBindError(c, err)
			return
		}
		body = input.Body
		mediaType = input.MediaType
		mediaURL = input.MediaUrl
	} else {
		// multipart/form-data: arquivo(s) de mídia
		body = c.PostForm("body")
		file, header, err := c.Request.FormFile("medias")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "medias file required for multipart"})
			return
		}
		defer func() { _ = file.Close() }()

		mimeType := header.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}

		savedURL, err := mediastore.SaveMediaReader(file, mimeType)
		if err != nil {
			log.Printf("[SendMessage] media save failed (ticket %d): %v", ticketID, err)
			utils.RespondWithInternalError(c, err, "SendMessage.SaveMedia")
			return
		}

		mediaURL = savedURL
		mediaType = mimeTypeToMediaType(mimeType)
	}

	commandType := "message.send.text"
	if mediaURL != "" {
		commandType = "message.send.media"
	}

	command := map[string]interface{}{
		"type": commandType,
		"payload": map[string]interface{}{
			"ticketId":  ticketID,
			"body":      body,
			"mediaType": mediaType,
			"mediaUrl":  mediaURL,
		},
	}

	routingKey := fmt.Sprintf("wbot.%s.%d.command", tenantID.String(), ticket.WhatsappID)
	if err := mc.rabbit.PublishCommand(routingKey, command); err != nil {
		utils.RespondWithInternalError(c, err, "SendMessage")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message sent"})
}

func mimeTypeToMediaType(mimeType string) string {
	switch {
	case len(mimeType) >= 5 && mimeType[:5] == "image":
		return "image"
	case len(mimeType) >= 5 && mimeType[:5] == "video":
		return "video"
	case len(mimeType) >= 5 && mimeType[:5] == "audio":
		return "audio"
	default:
		return "document"
	}
}
