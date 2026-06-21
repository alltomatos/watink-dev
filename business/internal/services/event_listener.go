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
	broadcast      *RedisBroadcast
}

func NewEventListener(sessions domain.ChannelSessionRepository, messages domain.MessageRepository, contacts domain.ContactRepository, tickets domain.TicketRepository, rm *usecases.ReceiveMessageUseCase, broadcast *RedisBroadcast) *EventListener {
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
			return handleMessageReaction(env.Payload, tid)
		case "contact.update":
			return handleContactUpdate(ctx, eventListener.contacts, env.Payload, tid)
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
		IsLID:         p.IsLid,
		Participant:   p.Participant,
		IsGroup:       p.IsGroup,
		IsCommunity:   p.IsCommunity,
		IsSubGroup:    p.IsSubGroup,
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
	el.broadcast.EmitToRoom("/", room, "appMessage", map[string]interface{}{"action": "create", "message": result.Message})
	el.broadcast.EmitToNamespace("/", "ticket", map[string]interface{}{"action": "update", "ticket": result.Ticket})

	return nil
}

func (el *EventListener) handleQrCode(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	sessions := el.sessions
	var p QrCodePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	sessionID := getSessionID(p.SessionID)
	if err := sessions.Update(ctx, &domain.ChannelSession{ID: sessionID, TenantID: tenantID}, map[string]interface{}{
		"qrcode": p.QrCode,
		"status": "QRCODE",
	}); err != nil {
		log.Printf("Error updating qrcode/status for session %d: %v", sessionID, err)
		return err
	}

	el.broadcast.EmitToNamespace("/", "whatsappSession", map[string]interface{}{"action": "update", "session": map[string]interface{}{"id": sessionID, "qrcode": p.QrCode, "status": "QRCODE"}})
	return nil
}

func (el *EventListener) handlePairingCode(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	sessions := el.sessions
	var p PairingCodePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	sessionID := getSessionID(p.SessionID)
	status := p.Status
	if status == "" {
		status = "QRCODE"
	}

	if err := sessions.Update(ctx, &domain.ChannelSession{ID: sessionID, TenantID: tenantID}, map[string]interface{}{"status": status}); err != nil {
		return err
	}

	el.broadcast.EmitToNamespace("/", "whatsappSession", map[string]interface{}{"action": "update", "session": map[string]interface{}{"id": sessionID, "status": status, "pairingCode": p.PairingCode}})
	return nil
}

func (el *EventListener) handleSessionStatus(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	sessions := el.sessions
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
	if p.Status == "CONNECTED" {
		now := time.Now()
		updates["lastConnectedAt"] = &now
	}

	if err := sessions.Update(ctx, &domain.ChannelSession{ID: sessionID, TenantID: tenantID}, updates); err != nil {
		return err
	}

	el.broadcast.EmitToNamespace("/", "whatsappSession", map[string]interface{}{"action": "update", "session": map[string]interface{}{"id": sessionID, "status": p.Status, "number": p.Number, "profilePicUrl": p.ProfilePicUrl, "firstConnection": updates["firstConnection"]}})
	return nil
}

// handleHistorySync inserts recovered conversation history into a ticket.
//
// On-demand recovery (ticketId > 0) inserts each message into the given ticket
// WITHOUT reopening it, changing its status, bumping unread counters or firing
// new-message notifications — it only backfills the timeline. Bootstrap syncs
// (no ticketId / no messages) are ignored.
func (el *EventListener) handleHistorySync(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	var p HistorySyncPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	if p.TicketID == 0 || len(p.Messages) == 0 {
		log.Printf("[EventListener] History sync for session %s type %s ignored (ticketId=%d, %d messages)", p.SessionID, p.Type, p.TicketID, len(p.Messages))
		return nil
	}

	ticket, err := el.tickets.FindByID(ctx, p.TicketID, tenantID)
	if err != nil {
		return err
	}
	if ticket == nil {
		log.Printf("[EventListener] History sync target ticket %d not found (tenant %s)", p.TicketID, tenantID)
		return nil
	}
	contactID := ticket.ContactID

	inserted := 0
	for _, m := range p.Messages {
		dataJSON, _ := json.Marshal(map[string]interface{}{
			"jid":         m.From,
			"participant": m.Participant,
			"pushName":    m.PushName,
			"isGroup":     m.IsGroup,
			"isLid":       m.IsLid,
			"mimetype":    m.Mimetype,
			"mediaData":   m.MediaData,
			"history":     true,
		})

		mediaType := m.Type
		if mediaType == "" {
			mediaType = "chat"
		}
		createdAt := time.Unix(m.Timestamp, 0)
		if m.Timestamp == 0 {
			createdAt = time.Now()
		}

		msg := &domain.Message{
			ID:          m.ID,
			Body:        m.Body,
			TicketID:    ticket.ID,
			ContactID:   &contactID,
			FromMe:      m.FromMe,
			TenantID:    tenantID,
			MediaType:   mediaType,
			MediaUrl:    m.MediaUrl,
			Participant: m.Participant,
			DataJson:    string(dataJSON),
			CreatedAt:   createdAt,
			UpdatedAt:   time.Now(),
		}
		if err := el.messages.CreateIfNotExists(ctx, msg); err != nil {
			log.Printf("[EventListener] history message %s insert failed: %v", m.ID, err)
			continue
		}
		inserted++
		el.broadcast.EmitToRoom("/", strconv.Itoa(ticket.ID), "appMessage", map[string]interface{}{"action": "create", "message": msg, "history": true})
	}

	log.Printf("[EventListener] History sync ticket %d: %d/%d messages backfilled", ticket.ID, inserted, len(p.Messages))
	return nil
}

func (el *EventListener) handleMessageAck(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	messages := el.messages
	tickets := el.tickets
	var p struct {
		MessageID string `json:"messageId"`
		Ack       int    `json:"ack"`
	}
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	msg, err := messages.FindByID(ctx, p.MessageID, tenantID)
	if err != nil {
		return nil
	}
	if msg == nil {
		// ack for a message we don't have (e.g. the device's own prior messages
		// synced on connect) — nothing to update.
		return nil
	}
	if p.Ack > msg.Ack {
		if err := messages.Update(ctx, msg, map[string]interface{}{"ack": p.Ack}); err != nil {
			return err
		}
		msg.Ack = p.Ack
		el.broadcast.EmitToRoom("/", strconv.Itoa(msg.TicketID), "appMessage", map[string]interface{}{"action": "update", "message": msg})

		// ack >= 3 (read by recipient) on an outgoing message means the contact read our messages.
		// Zero unreadMessages on the ticket and notify the frontend.
		if p.Ack >= 3 && !msg.FromMe {
			ticket, err := tickets.FindByID(ctx, msg.TicketID, tenantID)
			if err == nil && ticket != nil && ticket.UnreadMessages > 0 {
				_ = tickets.Update(ctx, ticket, map[string]interface{}{"unreadMessages": 0})
				ticket.UnreadMessages = 0
				el.broadcast.EmitToNamespace("/", "ticket", map[string]interface{}{"action": "update", "ticket": ticket})
			}
		}
	}
	return nil
}

func (el *EventListener) handleMessageRevoke(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	messages := el.messages
	var p MessageRevokePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}
	msg, err := messages.FindByID(ctx, p.MessageID, tenantID)
	if err != nil {
		return nil
	}
	if msg == nil {
		return nil
	}
	if err := messages.Update(ctx, msg, map[string]interface{}{"isDeleted": true}); err != nil {
		return err
	}
	msg.IsDeleted = true
	el.broadcast.EmitToRoom("/", strconv.Itoa(msg.TicketID), "appMessage", map[string]interface{}{"action": "update", "message": msg})
	return nil
}

func handleMessageReaction(payload json.RawMessage, tenantID uuid.UUID) error {
	var p MessageReactionPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}
	_ = tenantID
	log.Printf("Reaction received: %+v", p)
	return nil
}

// handleContactUpdate persists a WhatsApp-pushed contact change (display name /
// profile picture) when it arrives without a message. It only updates an existing
// contact and never overwrites a name the user has personalized — the push name is
// applied only when the stored name is empty or still equals the raw number.
func handleContactUpdate(ctx context.Context, contacts domain.ContactRepository, payload json.RawMessage, tenantID uuid.UUID) error {
	var p ContactUpdatePayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	number := jidToNumber(p.Contact.JID)
	if number == "" {
		number = p.Contact.Number
	}
	if number == "" {
		return nil
	}

	contact, err := contacts.FindByNumber(ctx, tenantID, number, false)
	if err != nil {
		return err
	}
	if contact == nil {
		return nil
	}

	fields := map[string]interface{}{}
	if p.Contact.PushName != "" && (contact.Name == "" || contact.Name == number) {
		fields["name"] = p.Contact.PushName
	}
	if p.Contact.ProfilePicUrl != "" {
		fields["profilePicUrl"] = p.Contact.ProfilePicUrl
	}
	if len(fields) == 0 {
		return nil
	}

	return contacts.Update(ctx, contact, fields)
}

// jidToNumber extracts the bare number from a WhatsApp JID (user part before @/:).
func jidToNumber(jid string) string {
	if jid == "" {
		return ""
	}
	base := strings.Split(jid, "@")[0]
	return strings.Split(base, ":")[0]
}

// handleContactImport persists a batch of contacts pulled from the WhatsApp
// address book. Each contact is upserted via FindOrCreate, so re-running the
// import is idempotent and never duplicates existing contacts.
func handleContactImport(ctx context.Context, contacts domain.ContactRepository, payload json.RawMessage, tenantID uuid.UUID) error {
	var p ContactImportPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	imported := 0
	for _, c := range p.Contacts {
		if c.Number == "" {
			continue
		}
		name := c.Name
		if name == "" {
			name = c.PushName
		}
		if _, err := contacts.FindOrCreate(ctx, tenantID, c.Number, name, "", false, false, ""); err != nil {
			log.Printf("[ContactImport] failed to upsert contact %s: %v", c.Number, err)
			continue
		}
		imported++
	}

	log.Printf("[ContactImport] session %s: %d/%d contacts imported (tenant %s)", p.SessionID, imported, len(p.Contacts), tenantID)
	return nil
}

func handleJIDRegistered(ctx context.Context, sessions domain.ChannelSessionRepository, payload json.RawMessage, tenantID uuid.UUID) error {
	var p struct {
		SessionID string `json:"sessionId"`
		JID       string `json:"jid"`
	}
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}
	sessionID := getSessionID(p.SessionID)
	if p.JID == "" || sessionID == 0 {
		return nil
	}
	return sessions.Update(ctx, &domain.ChannelSession{ID: sessionID, TenantID: tenantID}, map[string]interface{}{"wid": p.JID})
}
