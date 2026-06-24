package services

import (
	"context"
	"encoding/json"
	"strconv"

	"github.com/google/uuid"
)

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
