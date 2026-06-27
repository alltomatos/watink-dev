package flow

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// OutboundChannelAdapter is the single pluggable port every node action that
// produces an external side effect (send WhatsApp, email, HTTP call, move a
// deal, touch a ticket) must go through. The FlowBuilder worker never talks to
// whatsmeow / SMTP / http directly — it resolves an adapter from the registry
// and calls Send. See ADR 0014.
//
// FASE 0 ships only the contract + an empty registry; no concrete adapter
// exists yet. The WhatsAppAdapter (FASE 1) will be a thin business-side shim
// that translates an OutboundMessage into the AMQP command
// `wbot.<tenant>.<session>.<cmd>` (routing key carries the command type;
// payload carries to/messageId/sessionId). The engine-go stays a dumb
// send-by-sessionId executor — pacing, chip rotation and anti-ban live in the
// business layer above this adapter, never in the engine.
type OutboundChannelAdapter interface {
	// Channel returns the channel kind this adapter serves
	// ("whatsapp" | "email" | "api" | "pipeline" | "ticket").
	Channel() string

	// Send delivers the (already interpolated) message. Implementations MUST
	// dedup by OutboundMessage.EnvID (Redis TTL 24h, prefix wbot:msg:) BEFORE
	// any real send, and scope every query by TenantID manually (RLS is inert
	// in the worker — ADR 0001).
	Send(ctx context.Context, msg OutboundMessage) error
}

// OutboundMessage is the channel-agnostic payload handed to an adapter. The
// concrete channel decides how to interpret it.
type OutboundMessage struct {
	TenantID    uuid.UUID `json:"tenantId"`
	SubjectType string    `json:"subjectType"` // ticket | contact | none
	SubjectID   *string   `json:"subjectId,omitempty"`

	// EnvID is the idempotency key used for dedup before any real send.
	EnvID string `json:"envId"`

	// To / SessionID address the destination for channels that need them
	// (whatsapp: SessionID is the chip; To uses @g.us for groups).
	To        string `json:"to,omitempty"`
	SessionID string `json:"sessionId,omitempty"`

	// Body is the already-interpolated content (variables resolved upstream;
	// missing variable → empty string).
	Body string `json:"body,omitempty"`

	// QuickAnswerID optionally references a QuickAnswers template to reuse.
	QuickAnswerID *int `json:"quickAnswerId,omitempty"`

	// Meta carries channel-specific extra fields (media, buttons, etc.).
	Meta map[string]any `json:"meta,omitempty"`
}

// ChannelRegistry resolves an OutboundChannelAdapter by its channel kind.
// Adapters are registered via DI in main.go (no service locator / global
// singleton — ADR 0006), so tests register a fake without touching globals.
type ChannelRegistry struct {
	adapters map[string]OutboundChannelAdapter
}

// NewChannelRegistry returns an empty registry. FASE 0 wires nothing into it.
func NewChannelRegistry() *ChannelRegistry {
	return &ChannelRegistry{adapters: make(map[string]OutboundChannelAdapter)}
}

// Register adds an adapter under its Channel() key. A later registration for
// the same channel overrides the earlier one (useful for test fakes).
func (r *ChannelRegistry) Register(a OutboundChannelAdapter) {
	if a == nil {
		return
	}
	r.adapters[a.Channel()] = a
}

// Get returns the adapter for the given channel, or (nil, false) if none is
// registered. The worker treats a missing adapter as a node-execution error,
// never a silent no-op.
func (r *ChannelRegistry) Get(channel string) (OutboundChannelAdapter, bool) {
	a, ok := r.adapters[channel]
	return a, ok
}

// MustGet returns the adapter for the channel or an error if absent.
func (r *ChannelRegistry) MustGet(channel string) (OutboundChannelAdapter, error) {
	a, ok := r.Get(channel)
	if !ok {
		return nil, fmt.Errorf("no outbound adapter registered for channel %q", channel)
	}
	return a, nil
}
