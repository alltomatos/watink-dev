package flow

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"

	"github.com/alltomatos/watinkdev/business/pkg/utils"
)

// unresolvedToken matches any {{...}} placeholder left after interpolation. The
// inner pattern is non-greedy and excludes braces so adjacent tokens are matched
// individually.
var unresolvedToken = regexp.MustCompile(`\{\{[^{}]*\}\}`)

// applyVars interpolates {{vars}} into text using the run's variable map, then
// strips any token that had no matching variable to "" — enforcing the module
// invariant "variável ausente → vazio". (The shared InterpolateVariables only
// replaces known keys; without this strip an unknown {{token}} would leak to the
// contact verbatim. QuickAnswers preview keeps tokens on purpose and does NOT use
// this path.)
func applyVars(st *ExecState, text string) string {
	out := utils.InterpolateVariables(text, st.Vars)
	return unresolvedToken.ReplaceAllString(out, "")
}

// envID builds the per-node-per-run idempotency key for an outbound send, so a
// redelivered inbound that re-advances the same node does not double-send.
func envID(st *ExecState, nodeID string) string {
	return fmt.Sprintf("flow:%s:%s", st.Run.ID.String(), nodeID)
}

// envIDWithSuffix is envID plus a discriminator so the SAME node can legitimately
// send more than once in a run without the adapter's dedup lock swallowing the
// later sends. Used by the menu reprompt: each invalid reply must re-present the
// menu, but a plain envID(node) would collide with the first presentation's lock
// (held for 24h) and silently no-op. The suffix (e.g. an attempt counter) makes
// each reprompt a distinct idempotency key while still deduping true redeliveries
// of that same attempt.
func envIDWithSuffix(st *ExecState, nodeID, suffix string) string {
	if suffix == "" {
		return envID(st, nodeID)
	}
	return fmt.Sprintf("flow:%s:%s#%s", st.Run.ID.String(), nodeID, suffix)
}

// destination returns the WhatsApp JID for the run's contact (groups use @g.us;
// LID contacts use their @lid JID; regular users go bare).
func destination(st *ExecState) string {
	if st.Contact == nil {
		return ""
	}
	if st.Contact.IsGroup {
		return st.Contact.Number + "@g.us"
	}
	if st.Contact.Lid != nil && *st.Contact.Lid != "" {
		return *st.Contact.Lid
	}
	return st.Contact.Number
}

// sessionID returns the chip (Ticket.WhatsappID) as the engine session string.
func sessionID(st *ExecState) string {
	if st.Ticket == nil {
		return ""
	}
	return strconv.Itoa(st.Ticket.WhatsappID)
}

// sendWhatsApp resolves the "whatsapp" adapter from the registry and sends body
// (+ optional media meta) to the run's contact. EnvID is per-node-per-run, so a
// redelivered inbound that re-advances the same node does not double-send.
func sendWhatsApp(ctx context.Context, st *ExecState, nodeID, body string, meta map[string]any) error {
	return sendWhatsAppEnv(ctx, st, envID(st, nodeID), body, meta)
}

// sendWhatsAppEnv is sendWhatsApp with an explicit EnvID, letting a node that may
// legitimately re-send within a run (the menu reprompt) supply a per-attempt key
// instead of the per-node one. The adapter still dedups redeliveries of that
// exact key.
func sendWhatsAppEnv(ctx context.Context, st *ExecState, env, body string, meta map[string]any) error {
	if st.Registry == nil {
		return fmt.Errorf("flow: no channel registry in exec state")
	}
	adapter, err := st.Registry.MustGet("whatsapp")
	if err != nil {
		return err
	}
	return adapter.Send(ctx, OutboundMessage{
		TenantID:    st.TenantID,
		SubjectType: OutboundSubjectTicket(st),
		EnvID:       env,
		To:          destination(st),
		SessionID:   sessionID(st),
		Body:        body,
		Meta:        meta,
	})
}

// OutboundSubjectTicket returns "ticket" when the run is ticket-bound, else
// "none" — keeps the OutboundMessage subject consistent with the run.
func OutboundSubjectTicket(st *ExecState) string {
	if st.Ticket != nil {
		return "ticket"
	}
	return "none"
}

// messageData is the "message" node envelope (MessageForm.tsx): contentType ∈
// {text,image,video,audio,file}, content carries text, mediaUrl carries media.
type messageData struct {
	ContentType string `json:"contentType"`
	Content     string `json:"content"`
	MediaURL    string `json:"mediaUrl"`
}

// messageExecutor interpolates the message body and sends it via the whatsapp
// adapter, then advances. Media nodes attach mediaUrl/mediaType through Meta.
type messageExecutor struct{}

func (messageExecutor) Type() string { return string(NodeMessage) }

func (messageExecutor) Execute(ctx context.Context, st *ExecState, node Node) (Outcome, error) {
	var d messageData
	if len(node.Data) > 0 {
		_ = json.Unmarshal(node.Data, &d)
	}

	var meta map[string]any
	body := applyVars(st, d.Content)

	if d.ContentType != "" && d.ContentType != "text" && d.MediaURL != "" {
		meta = map[string]any{
			"mediaUrl":  d.MediaURL,
			"mediaType": d.ContentType,
		}
	}

	if body == "" && meta == nil {
		// Nothing to send (empty text node) — just advance, do not error.
		return Outcome{Kind: OutcomeAdvance, Detail: "empty message"}, nil
	}

	if err := sendWhatsApp(ctx, st, node.ID, body, meta); err != nil {
		return Outcome{}, err
	}
	return Outcome{Kind: OutcomeAdvance, Detail: "sent"}, nil
}
