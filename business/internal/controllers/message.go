package controllers

import (
	"fmt"
	"net/http"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
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
// @Success      200       {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /messages/{ticketId} [get]
func (mc *MessageController) ListMessages(c *gin.Context) {
	db, _, ok := auth.GetScoped(c, "Messages")
	if !ok {
		return
	}
	ticketID := c.Param("ticketId")

	var messages []models.Message
	if err := db.
		Where("\"ticketId\" = ?", ticketID).
		Order("\"createdAt\" ASC").
		Find(&messages).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListMessages")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"count":    len(messages),
	})
}

// @Summary      Enviar mensagem
// @Description  Envia mensagem via engine WhatsApp através do RabbitMQ
// @Tags         messages
// @Accept       json
// @Produce      json
// @Param        ticketId  path      int                     true  "ID do ticket"
// @Param        body      body      map[string]interface{}  true  "Conteúdo da mensagem"
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

	var input struct {
		Body      string `json:"body"`
		MediaType string `json:"mediaType"`
		MediaUrl string `json:"mediaUrl"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	// Publish outbound message command via RabbitMQ
	command := map[string]interface{}{
		"type": "message.send",
		"payload": map[string]interface{}{
			"ticketId":  ticketID,
			"body":      input.Body,
			"mediaType": input.MediaType,
			"mediaUrl":  input.MediaUrl,
		},
	}

	// Use afinidade: wbot.{tenantId}.{sessionId}.command
	routingKey := fmt.Sprintf("wbot.%s.%d.command", tenantID.String(), ticket.WhatsappID)
	if err := mc.rabbit.PublishCommand(routingKey, command); err != nil {
		utils.RespondWithInternalError(c, err, "SendMessage")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message sent"})
}
