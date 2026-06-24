package controllers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/mediastore"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

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
		if _, err := utils.ValidateStringField(input.Body, "body", 65535); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if _, err := utils.ValidateStringField(input.MediaType, "mediaType", 50); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if _, err := utils.ValidateStringField(input.MediaUrl, "mediaUrl", 2048); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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

		mimeType := sanitizeMimeType(header.Header.Get("Content-Type"))

		savedURL, err := mediastore.SaveMediaReader(file, mimeType)
		if err != nil {
			log.Printf("[SendMessage] media save failed (ticket %d)", ticketID)
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

// sanitizeMimeType strips newlines and control characters from a user-supplied
// Content-Type header to prevent log injection. Falls back to
// "application/octet-stream" when the value is empty after sanitization.
func sanitizeMimeType(raw string) string {
	safe := strings.Map(func(r rune) rune {
		if r == '\n' || r == '\r' || r < 0x20 {
			return -1
		}
		return r
	}, raw)
	if safe == "" {
		return "application/octet-stream"
	}
	return safe
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
