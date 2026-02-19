package services

import (
	"encoding/json"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/google/uuid"
	"github.com/streadway/amqp"
)

type EventEnvelope struct {
	Type     string          `json:"type"`
	Payload  json.RawMessage `json:"payload"`
	TenantID string          `json:"tenantId"`
}

type QrCodePayload struct {
	SessionID string `json:"sessionId"`
	QrCode    string `json:"qrcode"`
}

type SessionStatusPayload struct {
	SessionID     string `json:"sessionId"`
	Status        string `json:"status"`
	Number        string `json:"number"`
	ProfilePicUrl string `json:"profilePicUrl"`
}

type MessagePayload struct {
	ID        string `json:"id"`
	Body      string `json:"body"`
	Type      string `json:"type"`
	FromMe    bool   `json:"fromMe"`
	Timestamp int64  `json:"timestamp"`
	TicketID  int    `json:"ticketId"`
	ContactID int    `json:"contactId"`
	TenantID  string `json:"tenantId"`
}

type MessageReceivedPayload struct {
	Message   MessagePayload `json:"message"`
	SessionID string         `json:"sessionId"`
}

func getSessionID(id string) int {
	parts := strings.Split(id, "-")
	val, _ := strconv.Atoi(parts[0])
	return val
}

func StartEventListener(rabbitMQ *RabbitMQService) {
	routingKeys := []string{
		"wbot.*.*.session.qrcode",
		"wbot.*.*.session.status",
		"wbot.*.*.message.received",
		"wbot.*.*.message.ack",
		"wbot.*.*.message.revoke",
		"wbot.*.*.message.reaction",
		"wbot.*.*.contact.update",
	}

	err := rabbitMQ.ConsumeEvents("api.events.process.go", routingKeys, func(d amqp.Delivery) {
		var env EventEnvelope
		if err := json.Unmarshal(d.Body, &env); err != nil {
			log.Printf("Error unmarshaling event: %v", err)
			d.Nack(false, false)
			return
		}

		log.Printf("[EventListener] Event received: %s", env.Type)

		switch env.Type {
		case "session.qrcode":
			handleQrCode(env.Payload)
		case "session.status":
			handleSessionStatus(env.Payload)
		case "message.received":
			handleMessageReceived(env.Payload, env.TenantID)
		case "message.ack":
			handleMessageAck(env.Payload, env.TenantID)
		}

		d.Ack(false)
	})

	if err != nil {
		log.Printf("Error starting event listener: %v", err)
	}
}

func handleQrCode(payload json.RawMessage) {
	var p QrCodePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		log.Printf("Error unmarshaling QrCodePayload: %v", err)
		return
	}

	sessionID := getSessionID(p.SessionID)
	if err := database.DB.Model(&models.Whatsapp{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
		"qrcode": p.QrCode,
		"status": "QRCODE",
	}).Error; err != nil {
		log.Printf("Error updating qrcode/status for session %d: %v", sessionID, err)
	}

	EmitToNamespace("/", "whatsappSession", map[string]interface{}{
		"action": "update",
		"session": map[string]interface{}{
			"id":     sessionID,
			"qrcode": p.QrCode,
			"status": "QRCODE",
		},
	})
}

func handleSessionStatus(payload json.RawMessage) {
	var p SessionStatusPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		log.Printf("Error unmarshaling SessionStatusPayload: %v", err)
		return
	}

	sessionID := getSessionID(p.SessionID)
	updates := map[string]interface{}{
		"status": p.Status,
		"qrcode": "",
	}
	if p.Number != "" {
		updates["number"] = p.Number
	}
	if p.ProfilePicUrl != "" {
		updates["profilePicUrl"] = p.ProfilePicUrl
	}

	database.DB.Model(&models.Whatsapp{}).Where("id = ?", sessionID).Updates(updates)

	EmitToNamespace("/", "whatsappSession", map[string]interface{}{
		"action": "update",
		"session": map[string]interface{}{
			"id":            sessionID,
			"status":        p.Status,
			"number":        p.Number,
			"profilePicUrl": p.ProfilePicUrl,
		},
	})
}

func handleMessageReceived(payload json.RawMessage, tenantID string) {
	var p MessageReceivedPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		log.Printf("Error unmarshaling MessageReceivedPayload: %v", err)
		return
	}

	tid, _ := uuid.Parse(tenantID)
	msg := models.Message{
		ID:        p.Message.ID,
		Body:      p.Message.Body,
		TicketID:  p.Message.TicketID,
		ContactID: &p.Message.ContactID,
		FromMe:    p.Message.FromMe,
		TenantID:  tid,
		MediaType: p.Message.Type,
		CreatedAt: time.Unix(p.Message.Timestamp, 0),
		UpdatedAt: time.Now(),
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		log.Printf("Error saving message: %v", err)
		return
	}

	room := strconv.Itoa(msg.TicketID)
	EmitToRoom("/", room, "appMessage", map[string]interface{}{
		"action":  "create",
		"message": msg,
	})
}

func handleMessageAck(payload json.RawMessage, tenantID string) {
	var p struct {
		MessageID string `json:"messageId"`
		Ack       int    `json:"ack"`
	}
	if err := json.Unmarshal(payload, &p); err != nil {
		return
	}

	tid, _ := uuid.Parse(tenantID)
	var msg models.Message
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", p.MessageID, tid).First(&msg).Error; err == nil {
		if p.Ack > msg.Ack {
			database.DB.Model(&msg).Update("ack", p.Ack)
			
			room := strconv.Itoa(msg.TicketID)
			EmitToRoom("/", room, "appMessage", map[string]interface{}{
				"action":  "update",
				"message": msg,
			})
		}
	}
}
