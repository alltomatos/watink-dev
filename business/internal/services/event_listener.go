package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
	amqp "github.com/streadway/amqp"
)

type EventListener struct {
	sessions       domain.ChannelSessionRepository
	messages       domain.MessageRepository
	contacts       domain.ContactRepository
	tickets        domain.TicketRepository
	receiveMessage *usecases.ReceiveMessageUseCase
	broadcast      domain.Broadcaster
}

func NewEventListener(sessions domain.ChannelSessionRepository, messages domain.MessageRepository, contacts domain.ContactRepository, tickets domain.TicketRepository, rm *usecases.ReceiveMessageUseCase, broadcast domain.Broadcaster) *EventListener {
	return &EventListener{sessions: sessions, messages: messages, contacts: contacts, tickets: tickets, receiveMessage: rm, broadcast: broadcast}
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
		"wbot.*.*.message.media",
		"wbot.*.*.contact.update",
		"wbot.*.*.contact.import",
		"wbot.*.*.session.jid_registered",
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

		ctx := context.Background()
		switch env.Type {
		case "session.qrcode":
			return eventListener.handleQrCode(ctx, env.Payload, tid)
		case "session.pairing_code":
			return eventListener.handlePairingCode(ctx, env.Payload, tid)
		case "session.status":
			return eventListener.handleSessionStatus(ctx, env.Payload, tid)
		case "session.history_sync":
			return eventListener.handleHistorySync(ctx, env.Payload, tid)
		case "message.received":
			var p MessageReceivedPayload
			if err := json.Unmarshal(env.Payload, &p); err != nil {
				return err
			}
			return eventListener.processMessage(ctx, p.Message, p.SessionID, tid)
		case "message.ack":
			return eventListener.handleMessageAck(ctx, env.Payload, tid)
		case "message.revoke":
			return eventListener.handleMessageRevoke(ctx, env.Payload, tid)
		case "message.reaction":
			return eventListener.handleMessageReaction(ctx, env.Payload, tid)
		case "message.media":
			return eventListener.handleMediaDownloaded(ctx, env.Payload, tid)
		case "contact.update":
			return handleContactUpdate(ctx, eventListener.contacts, eventListener.broadcast, env.Payload, tid)
		case "contact.import":
			return handleContactImport(ctx, eventListener.contacts, env.Payload, tid)
		case "session.jid_registered":
			return handleJIDRegistered(ctx, eventListener.sessions, env.Payload, tid)
		default:
			return nil
		}
	})

	if err != nil {
		log.Printf("Error starting event listener: %v", err)
	}
}

func (el *EventListener) processMessage(ctx context.Context, p MessagePayload, rawSessionID string, tenantID uuid.UUID) error {
	sessionID := getSessionID(rawSessionID)

	result, err := el.receiveMessage.Execute(ctx, usecases.ReceiveMessageInput{
		ID:            p.ID,
		From:          p.From,
		Body:          p.Body,
		Type:          p.Type,
		FromMe:        p.FromMe,
		Timestamp:     p.Timestamp,
		PushName:      p.PushName,
		GroupName:     p.GroupName,
		QuotedMsgID:   p.QuotedMsgId,
		ProfilePicURL: p.ProfilePicUrl,
		SenderPicURL:  p.SenderPicUrl,
		IsLID:         p.IsLid,
		Participant:   p.Participant,
		IsGroup:       p.IsGroup,
		IsCommunity:   p.IsCommunity,
		IsSubGroup:    p.IsSubGroup,
		MediaURL:      p.MediaUrl,
		MediaData:     p.MediaData,
		Mimetype:      p.Mimetype,
		Thumbnail:     p.Thumbnail,
		MediaProto:    p.MediaProto,
		SessionID:     sessionID,
		TenantID:      tenantID,
	})
	if err != nil {
		return err
	}

	room := strconv.Itoa(result.Ticket.ID)
	msgPayload := map[string]interface{}{"action": "create", "message": result.Message, "ticket": result.Ticket, "contact": result.Contact}
	el.broadcast.EmitToRoom("/", room, "appMessage", msgPayload)
	el.broadcast.EmitToTenantRoom(tenantID.String(), "appMessage", msgPayload)
	el.broadcast.EmitToTenantRoom(tenantID.String(), "ticket", map[string]interface{}{"action": "update", "ticket": result.Ticket, "contact": result.Contact})

	return nil
}
