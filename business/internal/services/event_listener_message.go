package services

import (
	"context"
	"encoding/json"
	"strconv"

	"github.com/google/uuid"
)

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
				el.broadcast.EmitToTenantRoom(tenantID.String(), "ticket", map[string]interface{}{"action": "update", "ticket": ticket})
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

func (el *EventListener) handleMessageReaction(ctx context.Context, payload json.RawMessage, tenantID uuid.UUID) error {
	var p MessageReactionPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		return err
	}

	if p.MessageID == "" {
		return nil
	}

	msg, err := el.messages.FindByID(ctx, p.MessageID, tenantID)
	if err != nil || msg == nil {
		return nil
	}

	var reactions []map[string]interface{}
	if msg.Reactions != "" && msg.Reactions != "[]" {
		_ = json.Unmarshal([]byte(msg.Reactions), &reactions)
	}

	sender := p.Sender
	if sender == "" {
		sender = p.JID
	}

	updated := false
	for i, r := range reactions {
		if s, ok := r["sender"].(string); ok && s == sender {
			if p.Reaction == "" {
				reactions = append(reactions[:i], reactions[i+1:]...)
			} else {
				reactions[i]["reaction"] = p.Reaction
				reactions[i]["timestamp"] = p.Timestamp
			}
			updated = true
			break
		}
	}
	if !updated && p.Reaction != "" {
		reactions = append(reactions, map[string]interface{}{
			"sender":    sender,
			"reaction":  p.Reaction,
			"fromMe":    p.FromMe,
			"timestamp": p.Timestamp,
		})
	}

	reactionsJSON, err := json.Marshal(reactions)
	if err != nil {
		return err
	}
	msg.Reactions = string(reactionsJSON)

	if err := el.messages.Update(ctx, msg, map[string]interface{}{"reactions": msg.Reactions}); err != nil {
		return err
	}

	el.broadcast.EmitToRoom("/", strconv.Itoa(msg.TicketID), "appMessage", map[string]interface{}{"action": "update", "message": msg})
	return nil
}
