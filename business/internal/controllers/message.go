package controllers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/database"
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
)

type MessageController struct {
	rabbit domain.RabbitMQServiceInterface
}

func NewMessageController(r domain.RabbitMQServiceInterface) *MessageController {
	return &MessageController{rabbit: r}
}

// ListMessages returns all messages for a given ticket.
func (mc *MessageController) ListMessages(c *gin.Context) {
	ticketID := c.Param("ticketId")

	var messages []models.Message
	if err := getScopedDB(c, "Messages").
		Where("\"ticketId\" = ?", ticketID).
		Order("\"createdAt\" ASC").
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"count":    len(messages),
	})
}

// SendMessage sends a message through the WhatsApp engine via RabbitMQ.
func (mc *MessageController) SendMessage(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	ticketIDStr := c.Param("ticketId")
	ticketID, err := strconv.Atoi(ticketIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ticket ID"})
		return
	}

	var ticket models.Ticket
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", ticketID, tenantID).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	var input struct {
		Body      string `json:"body"`
		MediaType string `json:"mediaType"`
		MediaUrl  string `json:"mediaUrl"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to send message: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message sent"})
}
