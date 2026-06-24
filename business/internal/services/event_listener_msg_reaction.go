package services

import (
	"context"
	"encoding/json"
	"strconv"

	"github.com/google/uuid"
)

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
