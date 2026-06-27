package flow

import (
	"context"
	"fmt"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
)

// dedupTTL is the idempotency window for an outbound send (mirrors the
// wbot:msg: Redis convention used across the message pipeline).
const dedupTTL = 24 * time.Hour

// WhatsAppAdapter is the FASE 1 OutboundChannelAdapter for the "whatsapp"
// channel. It is a thin business-side shim: it dedups by EnvID, then translates
// an OutboundMessage into the AMQP command `wbot.<tenant>.<session>.<cmd>` that
// the dumb engine-go executor consumes. No whatsmeow here (ADR 0014).
type WhatsAppAdapter struct {
	rabbit domain.CommandPublisher
	redis  domain.RedisService
}

// NewWhatsAppAdapter wires the adapter via constructor DI (no global/singleton).
func NewWhatsAppAdapter(rabbit domain.CommandPublisher, redis domain.RedisService) *WhatsAppAdapter {
	return &WhatsAppAdapter{rabbit: rabbit, redis: redis}
}

// Channel identifies this adapter in the registry.
func (a *WhatsAppAdapter) Channel() string { return "whatsapp" }

// Send dedups by EnvID, then publishes the engine command. A duplicate (lock
// already held) is a no-op success — the redelivery must not double-send.
//
// Meta keys honored: "messageId" (string, the WhatsApp msg id; generated if
// absent — but the caller should supply the EnvID-derived id for the persisted
// row to match the ack), "mediaType"/"mediaUrl"/"mimeType" (string).
func (a *WhatsAppAdapter) Send(ctx context.Context, msg OutboundMessage) error {
	if msg.To == "" {
		return fmt.Errorf("whatsapp adapter: empty destination (to)")
	}
	if msg.SessionID == "" {
		return fmt.Errorf("whatsapp adapter: empty sessionId")
	}

	// Dedup BEFORE any real send. SetLock is SetNX: false => already sent.
	if a.redis != nil && msg.EnvID != "" {
		acquired, err := a.redis.SetLock("wbot:msg:"+msg.EnvID, "1", dedupTTL)
		if err != nil {
			return fmt.Errorf("whatsapp adapter: dedup lock: %w", err)
		}
		if !acquired {
			return nil
		}
	}

	mediaType := metaString(msg.Meta, "mediaType")
	mediaURL := metaString(msg.Meta, "mediaUrl")
	mimeType := metaString(msg.Meta, "mimeType")

	commandType := "message.send.text"
	if mediaURL != "" {
		commandType = "message.send.media"
	}

	messageID := metaString(msg.Meta, "messageId")
	if messageID == "" {
		messageID = msg.EnvID
	}

	command := map[string]interface{}{
		"type": commandType,
		"payload": map[string]interface{}{
			"sessionId": msg.SessionID,
			"messageId": messageID,
			"to":        msg.To,
			"body":      msg.Body,
			"mediaType": mediaType,
			"mediaUrl":  mediaURL,
			"mimeType":  mimeType,
		},
	}

	// The engine dispatches by routing-key segment; the command type MUST be in
	// the key, not just the body. SessionID is the chip (Ticket.WhatsappID).
	routingKey := fmt.Sprintf("wbot.%s.%s.%s", msg.TenantID.String(), msg.SessionID, commandType)
	if err := a.rabbit.PublishCommand(routingKey, command); err != nil {
		return fmt.Errorf("whatsapp adapter: publish command: %w", err)
	}
	return nil
}

// metaString reads a string value from the channel-specific Meta map.
func metaString(m map[string]any, key string) string {
	if m == nil {
		return ""
	}
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
