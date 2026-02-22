package services

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/google/uuid"
	"github.com/streadway/amqp"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

type PairingCodePayload struct {
	SessionID   string `json:"sessionId"`
	PairingCode string `json:"pairingCode"`
	Status      string `json:"status"`
}

type SessionStatusPayload struct {
	SessionID       string `json:"sessionId"`
	Status          string `json:"status"`
	Number          string `json:"number"`
	ProfilePicUrl   string `json:"profilePicUrl"`
	FirstConnection bool   `json:"firstConnection"`
}

type MessagePayload struct {
	ID            string `json:"id"`
	From          string `json:"from"`
	Body          string `json:"body"`
	Type          string `json:"type"`
	FromMe        bool   `json:"fromMe"`
	Timestamp     int64  `json:"timestamp"`
	PushName      string `json:"pushName"`
	QuotedMsgId   string `json:"quotedMsgId"`
	ProfilePicUrl string `json:"profilePicUrl"`
	IsLid         bool   `json:"isLid"`
}

type MessageReceivedPayload struct {
	Message   MessagePayload `json:"message"`
	SessionID string         `json:"sessionId"`
}

type HistorySyncPayload struct {
	SessionID string          `json:"sessionId"`
	Type      string          `json:"type"`
	Progress  uint32          `json:"progress"`
	Messages  []MessagePayload `json:"messages"`
}

func getSessionID(id string) int {
	if strings.Contains(id, "-") {
		parts := strings.Split(id, "-")
		val, _ := strconv.Atoi(parts[len(parts)-1])
		return val
	}
	val, _ := strconv.Atoi(id)
	return val
}

func StartEventListener(rabbitMQ *RabbitMQService) {
	routingKeys := []string{
		"wbot.*.*.session.qrcode",
		"wbot.*.*.session.pairing_code",
		"wbot.*.*.session.status",
		"wbot.*.*.session.history_sync",
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

		log.Printf("[EventListener] Event received: %s (Tenant: %s)", env.Type, env.TenantID)

		err := database.DB.Transaction(func(tx *gorm.DB) error {
			if env.TenantID != "" {
				tx.Exec(fmt.Sprintf("SET app.current_tenant = '%s'", env.TenantID))
			}

			switch env.Type {
			case "session.qrcode":
				return handleQrCode(tx, env.Payload)
			case "session.pairing_code":
				return handlePairingCode(tx, env.Payload)
			case "session.status":
				return handleSessionStatus(tx, env.Payload)
			case "session.history_sync":
				return handleHistorySync(tx, env.Payload, env.TenantID)
			case "message.received":
				var p MessageReceivedPayload
				if err := json.Unmarshal(env.Payload, &p); err != nil {
					return err
				}
				return processMessage(tx, p.Message, p.SessionID, env.TenantID)
			case "message.ack":
				return handleMessageAck(tx, env.Payload, env.TenantID)
			default:
				return nil
			}
		})

		if err != nil {
			log.Printf("Error processing event %s: %v", env.Type, err)
		}

		d.Ack(false)
	})

	if err != nil {
		log.Printf("Error starting event listener: %v", err)
	}
}

func handleQrCode(tx *gorm.DB, payload json.RawMessage) error {
	var p QrCodePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	sessionID := getSessionID(p.SessionID)
	if err := tx.Model(&models.Whatsapp{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
		"qrcode": p.QrCode,
		"status": "QRCODE",
	}).Error; err != nil {
		log.Printf("Error updating qrcode/status for session %d: %v", sessionID, err)
		return err
	}

	EmitToNamespace("/", "whatsappSession", map[string]interface{}{
		"action": "update",
		"session": map[string]interface{}{
			"id":     sessionID,
			"qrcode": p.QrCode,
			"status": "QRCODE",
		},
	})
	return nil
}

func handlePairingCode(tx *gorm.DB, payload json.RawMessage) error {
	var p PairingCodePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	sessionID := getSessionID(p.SessionID)
	status := p.Status
	if status == "" {
		status = "QRCODE"
	}

	if err := tx.Model(&models.Whatsapp{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
		"status": status,
	}).Error; err != nil {
		return err
	}

	EmitToNamespace("/", "whatsappSession", map[string]interface{}{
		"action": "update",
		"session": map[string]interface{}{
			"id":          sessionID,
			"status":      status,
			"pairingCode": p.PairingCode,
		},
	})
	return nil
}

func handleSessionStatus(tx *gorm.DB, payload json.RawMessage) error {
	var p SessionStatusPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
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
	if p.FirstConnection {
		now := time.Now()
		updates["firstConnection"] = &now
	}

	if err := tx.Model(&models.Whatsapp{}).Where("id = ?", sessionID).Updates(updates).Error; err != nil {
		return err
	}

	EmitToNamespace("/", "whatsappSession", map[string]interface{}{
		"action": "update",
		"session": map[string]interface{}{
			"id":              sessionID,
			"status":          p.Status,
			"number":          p.Number,
			"profilePicUrl":   p.ProfilePicUrl,
			"firstConnection": updates["firstConnection"],
		},
	})
	return nil
}

func handleHistorySync(tx *gorm.DB, payload json.RawMessage, tenantID string) error {
	var p HistorySyncPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	log.Printf("[EventListener] Processing History Sync for session %s, type %s", p.SessionID, p.Type)

	for _, msgPayload := range p.Messages {
		if err := processMessage(tx, msgPayload, p.SessionID, tenantID); err != nil {
			log.Printf("Error processing history message %s: %v", msgPayload.ID, err)
		}
	}

	return nil
}

func processMessage(tx *gorm.DB, p MessagePayload, rawSessionID string, tenantID string) error {
	tid, _ := uuid.Parse(tenantID)
	sessionID := getSessionID(rawSessionID)

	// 1. Find or Create Contact
	number := strings.Split(p.From, "@")[0]
	if number == "" {
		return fmt.Errorf("empty sender number")
	}

	var contact models.Contact
	query := tx.Where("\"tenantId\" = ?", tid)
	if p.IsLid {
		query = query.Where("lid = ?", p.From)
	} else {
		query = query.Where("number = ?", number)
	}

	if err := query.First(&contact).Error; err != nil {
		contact = models.Contact{
			Name:     p.PushName,
			Number:   number,
			TenantID: tid,
		}
		if p.IsLid {
			contact.Lid = &p.From
		}
		if contact.Name == "" {
			contact.Name = number
		}
		if p.ProfilePicUrl != "" {
			contact.ProfilePicUrl = p.ProfilePicUrl
		}
		if err := tx.Create(&contact).Error; err != nil {
			return fmt.Errorf("failed to create contact: %v", err)
		}
	} else {
		// Enriquecimento: Atualizar push name ou avatar se mudou
		updates := make(map[string]interface{})
		if p.PushName != "" && (contact.Name == "" || contact.Name == contact.Number) {
			updates["name"] = p.PushName
		}
		if p.ProfilePicUrl != "" && contact.ProfilePicUrl == "" {
			updates["profilePicUrl"] = p.ProfilePicUrl
		}
		if len(updates) > 0 {
			tx.Model(&contact).Updates(updates)
		}
	}

	// 2. Find or Create Ticket
	var ticket models.Ticket
	if err := tx.Where("\"tenantId\" = ? AND \"contactId\" = ? AND \"whatsappId\" = ? AND status IN ('open', 'pending')", tid, contact.ID, sessionID).First(&ticket).Error; err != nil {
		ticket = models.Ticket{
			ContactID:  contact.ID,
			Status:     "pending",
			TenantID:   tid,
			WhatsappID: sessionID,
		}

		// Se o WhatsApp tiver uma fila padrão, poderíamos atribuir aqui.
		// No momento, vamos ver se o sistema já atribui uma fila padrão em algum lugar.
		// Se não, vamos deixar como está.
		
		if createErr := tx.Where(models.Ticket{ContactID: contact.ID, WhatsappID: sessionID, Status: "pending", TenantID: tid}).FirstOrCreate(&ticket).Error; createErr != nil {
			return fmt.Errorf("failed to ensure ticket: %v", createErr)
		}

		// Se o ticket acabou de ser criado e tem uma fila, distribuir
		if ticket.QueueID != nil {
			distService := NewDistributionService()
			distService.DistributeTicket(ticket.ID, *ticket.QueueID, tid)
		}
	}

	// 3. Save Message
	msg := models.Message{
		ID:          p.ID,
		Body:        p.Body,
		TicketID:    ticket.ID,
		ContactID:   &contact.ID,
		FromMe:      p.FromMe,
		TenantID:    tid,
		MediaType:   p.Type,
		CreatedAt:   time.Unix(p.Timestamp, 0),
		UpdatedAt:   time.Now(),
	}

	// Only set QuotedMsgId if it exists in DB to avoid FK violation
	if p.QuotedMsgId != "" {
		var exists int64
		tx.Model(&models.Message{}).Where("id = ?", p.QuotedMsgId).Count(&exists)
		if exists > 0 {
			msg.QuotedMsgID = &p.QuotedMsgId
		}
	}

	if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&msg).Error; err != nil {
		return fmt.Errorf("failed to save message: %v", err)
	}

	// Update Ticket LastMessage
	tx.Model(&ticket).Updates(map[string]interface{}{
		"lastMessage":    msg.Body,
		"updatedAt":      time.Now(),
		"unreadMessages": ticket.UnreadMessages + 1,
	})

	room := strconv.Itoa(ticket.ID)
	EmitToRoom("/", room, "appMessage", map[string]interface{}{
		"action":  "create",
		"message": msg,
	})

	EmitToNamespace("/", "ticket", map[string]interface{}{
		"action": "update",
		"ticket": ticket,
	})

	return nil
}

func handleMessageAck(tx *gorm.DB, payload json.RawMessage, tenantID string) error {
	var p struct {
		MessageID string `json:"messageId"`
		Ack       int    `json:"ack"`
	}
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	tid, _ := uuid.Parse(tenantID)
	var msg models.Message
	if err := tx.Where("id = ? AND \"tenantId\" = ?", p.MessageID, tid).First(&msg).Error; err == nil {
		if p.Ack > msg.Ack {
			tx.Model(&msg).Update("ack", p.Ack)
			
			room := strconv.Itoa(msg.TicketID)
			EmitToRoom("/", room, "appMessage", map[string]interface{}{
				"action":  "update",
				"message": msg,
			})
		}
	}
	return nil
}
