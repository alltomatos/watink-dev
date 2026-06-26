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
		el.bcast().EmitToRoom("/", "chat:"+strconv.Itoa(msg.TicketID), "appMessage", map[string]interface{}{"action": "update", "message": msg})

		// ack >= 3 (read by recipient) on an outgoing message means the contact read our messages.
		// Zero unreadMessages on the ticket and notify the frontend.
		if p.Ack >= 3 && !msg.FromMe {
			ticket, err := tickets.FindByID(ctx, msg.TicketID, tenantID)
			if err == nil && ticket != nil && ticket.UnreadMessages > 0 {
				_ = tickets.Update(ctx, ticket, map[string]interface{}{"unreadMessages": 0})
				ticket.UnreadMessages = 0
				el.bcast().EmitToTenantRoom(tenantID.String(), "ticket", map[string]interface{}{"action": "update", "ticket": ticket})
			}
		}
	}
	return nil
}
