package controllers

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/alltomatos/watinkdev/backend-go/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListMessages(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	ticketID := c.Param("ticketId")

	var messages []models.Message
	if err := database.DB.Where("\"ticketId\" = ? AND \"tenantId\" = ?", ticketID, tenantID).
		Order("\"createdAt\" ASC").
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
	})
}

func SendMessage(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	ticketID := c.Param("ticketId")

	// 1. Get Ticket
	var ticket models.Ticket
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", ticketID, tenantID).
		Preload("Contact").
		First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	// 2. Handle Medias or Text
	form, err := c.MultipartForm()
	if err == nil {
		// Multipart Form (possibly medias)
		files := form.File["medias"]
		bodies := form.Value["body"]

		for i, file := range files {
			caption := ""
			if i < len(bodies) {
				caption = bodies[i]
			} else if len(bodies) > 0 {
				caption = bodies[0]
			}

			// Save file
			filename := fmt.Sprintf("%d-%s", time.Now().UnixNano(), file.Filename)
			tenantDir := filepath.Join("public", tenantID.(uuid.UUID).String())
			_ = os.MkdirAll(tenantDir, 0755)
			dst := filepath.Join(tenantDir, filename)
			if err := c.SaveUploadedFile(file, dst); err != nil {
				log.Printf("Error saving file: %v", err)
				continue
			}

			mediaType := "chat"
			contentType := file.Header.Get("Content-Type")
			if strings.Contains(contentType, "image") {
				mediaType = "image"
			} else if strings.Contains(contentType, "video") {
				mediaType = "video"
			} else if strings.Contains(contentType, "audio") {
				mediaType = "audio"
			} else {
				mediaType = "document"
			}

			createMessage(ticket, caption, mediaType, fmt.Sprintf("%s/%s", tenantID.(uuid.UUID).String(), filename))
		}
	} else {
		// Simple JSON (text only)
		var req struct {
			Body string `json:"body" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		msg := createMessage(ticket, req.Body, "chat", "")
		c.JSON(http.StatusOK, msg)
		return
	}

	c.Status(http.StatusOK)
}

func createMessage(ticket models.Ticket, body string, mediaType string, mediaUrl string) models.Message {
	msg := models.Message{
		ID:        uuid.New().String(),
		Body:      body,
		TicketID:  ticket.ID,
		ContactID: &ticket.ContactID,
		FromMe:    true,
		Read:      true,
		MediaType: mediaType,
		MediaUrl:  mediaUrl,
		TenantID:  ticket.TenantID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	database.DB.Create(&msg)
	database.DB.Model(&ticket).Update("lastMessage", body)

	// Real-time
	services.EmitToRoom("/", strconv.Itoa(ticket.ID), "appMessage", map[string]interface{}{
		"action":  "create",
		"message": msg,
		"ticket":  ticket,
		"contact": ticket.Contact,
	})

	// RabbitMQ
	command := map[string]interface{}{
		"id":        uuid.New().String(),
		"timestamp": time.Now().Unix(),
		"tenantId":  ticket.TenantID,
		"type":      "message.send.text",
		"payload": map[string]interface{}{
			"sessionId": ticket.WhatsappID,
			"messageId": msg.ID,
			"to":        ticket.Contact.Number + "@s.whatsapp.net",
			"body":      body,
		},
	}
	
	if mediaUrl != "" {
		command["type"] = "message.send.media"
		command["payload"].(map[string]interface{})["mediaUrl"] = mediaUrl
		command["payload"].(map[string]interface{})["mediaType"] = mediaType
	}

	rabbit := services.NewRabbitMQService()
	routingKey := fmt.Sprintf("wbot.%s.%d.%s", ticket.TenantID, ticket.WhatsappID, command["type"])
	_ = rabbit.PublishCommand(routingKey, command)

	return msg
}
