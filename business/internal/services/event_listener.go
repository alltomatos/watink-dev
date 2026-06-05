package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"github.com/streadway/amqp"
	"gorm.io/gorm"
)

type EventListener struct {
	db             *gorm.DB
	receiveMessage *usecases.ReceiveMessageUseCase
}

func NewEventListener(db *gorm.DB, rm *usecases.ReceiveMessageUseCase) *EventListener {
	return &EventListener{db: db, receiveMessage: rm}
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

func StartEventListener(rabbitMQ *RabbitMQService, eventListener *EventListener) {
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

	err := rabbitMQ.ConsumeEvents("api.events.process.go", routingKeys, func(d amqp.Delivery) error {
		var env EventEnvelope
		if err := json.Unmarshal(d.Body, &env); err != nil {
			log.Printf("Error unmarshaling event: %v", err)
			return err
		}

		tid, err := uuid.Parse(env.TenantID)
		if err != nil {
			return fmt.Errorf("invalid tenantId %q: %w", env.TenantID, err)
		}

		log.Printf("[EventListener] Event received: %s (Tenant: %s)", env.Type, env.TenantID)

		return eventListener.db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec("SELECT set_config('app.current_tenant', ?, true)", tid.String()).Error; err != nil {
				return err
			}

			switch env.Type {
			case "session.qrcode":
				return handleQrCode(tx, env.Payload, tid)
			case "session.pairing_code":
				return handlePairingCode(tx, env.Payload, tid)
			case "session.status":
				return handleSessionStatus(tx, env.Payload, tid)
			case "session.history_sync":
				return handleHistorySync(tx, env.Payload, tid, eventListener)
			case "message.received":
				var p MessageReceivedPayload
				if err := json.Unmarshal(env.Payload, &p); err != nil {
					return err
				}
				return eventListener.processMessage(context.Background(), tx, p.Message, p.SessionID, tid)
			case "message.ack":
				return handleMessageAck(tx, env.Payload, tid)
			case "message.revoke":
				return handleMessageRevoke(tx, env.Payload, tid)
			case "message.reaction":
				return handleMessageReaction(tx, env.Payload, tid)
			case "contact.update":
				return handleContactUpdate(tx, env.Payload, tid)
			default:
				return nil
			}
		})
	})

	if err != nil {
		log.Printf("Error starting event listener: %v", err)
	}
}

func (el *EventListener) processMessage(ctx context.Context, tx *gorm.DB, p MessagePayload, rawSessionID string, tenantID uuid.UUID) error {
	sessionID := getSessionID(rawSessionID)

	result, err := el.receiveMessage.Execute(ctx, usecases.ReceiveMessageInput{
		ID:            p.ID,
		From:          p.From,
		Body:          p.Body,
		Type:          p.Type,
		FromMe:        p.FromMe,
		Timestamp:     p.Timestamp,
		PushName:      p.PushName,
		QuotedMsgID:   p.QuotedMsgId,
		ProfilePicURL: p.ProfilePicUrl,
		IsLID:         p.IsLid,
		Participant:   p.Participant,
		IsGroup:       p.IsGroup,
		MediaURL:      p.MediaUrl,
		MediaData:     p.MediaData,
		Mimetype:      p.Mimetype,
		SessionID:     sessionID,
		TenantID:      tenantID,
	})
	if err != nil {
		return err
	}

	room := strconv.Itoa(result.Ticket.ID)
	EmitToRoom("/", room, "appMessage", map[string]interface{}{"action": "create", "message": result.Message})
	EmitToNamespace("/", "ticket", map[string]interface{}{"action": "update", "ticket": result.Ticket})

	return nil
}

func handleQrCode(tx *gorm.DB, payload json.RawMessage, tenantID uuid.UUID) error {
	var p QrCodePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	sessionID := getSessionID(p.SessionID)
	if err := tx.Model(&models.Whatsapp{}).Where("id = ? AND \"tenantId\" = ?", sessionID, tenantID).Updates(map[string]interface{}{
		"qrcode": p.QrCode,
		"status":  "QRCODE",
	}).Error; err != nil {
		log.Printf("Error updating qrcode/status for session %d: %v", sessionID, err)
		return err
	}

	EmitToNamespace("/", "whatsappSession", map[string]interface{}{"action": "update", "session": map[string]interface{}{"id": sessionID, "qrcode": p.QrCode, "status": "QRCODE"}})
	return nil
}

func handlePairingCode(tx *gorm.DB, payload json.RawMessage, tenantID uuid.UUID) error {
	var p PairingCodePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	sessionID := getSessionID(p.SessionID)
	status := p.Status
	if status == "" {
		status = "QRCODE"
	}

	if err := tx.Model(&models.Whatsapp{}).Where("id = ? AND \"tenantId\" = ?", sessionID, tenantID).Updates(map[string]interface{}{"status": status}).Error; err != nil {
		return err
	}

	EmitToNamespace("/", "whatsappSession", map[string]interface{}{"action": "update", "session": map[string]interface{}{"id": sessionID, "status": status, "pairingCode": p.PairingCode}})
	return nil
}

func handleSessionStatus(tx *gorm.DB, payload json.RawMessage, tenantID uuid.UUID) error {
	var p SessionStatusPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	sessionID := getSessionID(p.SessionID)
	updates := map[string]interface{}{"status": p.Status, "qrcode": ""}
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

	result := tx.Model(&models.Whatsapp{}).Where("id = ? AND \"tenantId\" = ?", sessionID, tenantID).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return nil
	}

	EmitToNamespace("/", "whatsappSession", map[string]interface{}{"action": "update", "session": map[string]interface{}{"id": sessionID, "status": p.Status, "number": p.Number, "profilePicUrl": p.ProfilePicUrl, "firstConnection": updates["firstConnection"]}})
	return nil
}

func handleHistorySync(tx *gorm.DB, payload json.RawMessage, tenantID uuid.UUID, el *EventListener) error {
	var p HistorySyncPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	log.Printf("[EventListener] Processing History Sync for session %s, type %s", p.SessionID, p.Type)
	for _, msgPayload := range p.Messages {
		if err := el.processMessage(context.Background(), tx, msgPayload, p.SessionID, tenantID); err != nil {
			log.Printf("Error processing history message %s: %v", msgPayload.ID, err)
		}
	}
	return nil
}

func handleMessageAck(tx *gorm.DB, payload json.RawMessage, tenantID uuid.UUID) error {
	var p struct {
		MessageID string `json:"messageId"`
		Ack       int    `json:"ack"`
	}
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	var msg models.Message
	if err := tx.Where("id = ? AND \"tenantId\" = ?", p.MessageID, tenantID).First(&msg).Error; err == nil && p.Ack > msg.Ack {
		msg.Ack = p.Ack
		tx.Model(&msg).Update("ack", p.Ack)
		EmitToRoom("/", strconv.Itoa(msg.TicketID), "appMessage", map[string]interface{}{"action": "update", "message": msg})
	}
	return nil
}

func handleMessageRevoke(tx *gorm.DB, payload json.RawMessage, tenantID uuid.UUID) error {
	var p MessageRevokePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}
	var msg models.Message
	if err := tx.Where("id = ? AND \"tenantId\" = ?", p.MessageID, tenantID).First(&msg).Error; err != nil {
		return nil
	}
	msg.IsDeleted = true
	if err := tx.Model(&msg).Update("isDeleted", true).Error; err != nil {
		return err
	}
	EmitToRoom("/", strconv.Itoa(msg.TicketID), "appMessage", map[string]interface{}{"action": "update", "message": msg})
	return nil
}

func handleMessageReaction(tx *gorm.DB, payload json.RawMessage, tenantID uuid.UUID) error {
	var p MessageReactionPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}
	_ = tenantID
	log.Printf("Reaction received: %+v", p)
	return nil
}

func handleContactUpdate(tx *gorm.DB, payload json.RawMessage, tenantID uuid.UUID) error {
	var p ContactUpdatePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}
	_ = tenantID
	log.Printf("Contact update received: %+v", p)
	return nil
}