package flow

import (
	"encoding/json"
	"strings"
)

// Trigger projection constants. The skeleton's matchTriggers reads these
// projected columns ("triggerType"/"triggerValue") off the Flow row, so the
// graph's entry/trigger node MUST be projected onto them at Create/Update time.
const (
	// TriggerWhatsAppMessage fires on any inbound WhatsApp message; when a
	// keyword is set, TriggerValue carries the normalized keyword and the match
	// is exact (case-insensitive). Empty TriggerValue = match any message.
	TriggerWhatsAppMessage = "whatsapp_message"

	// TriggerWhatsAppFirstContact fires only on the first message of a brand-new
	// contact/ticket. TriggerValue is empty.
	TriggerWhatsAppFirstContact = "whatsapp_first_contact"
)

// triggerNodeData is the subset of a start/trigger node's data envelope that
// drives projection. Field names mirror the frontend (nodeEditorTypes.ts +
// TriggerForm/StartForm): triggerType ∈ {keyword,any,firstContact,message,...},
// with the keyword carried inside the conditions[] builder.
type triggerNodeData struct {
	TriggerType string `json:"triggerType"`
	Conditions  []struct {
		Field    string `json:"field"`
		Operator string `json:"operator"`
		Value    string `json:"value"`
	} `json:"conditions"`
}

// TriggerProjection is the flat (type,value) pair written to the Flow columns.
type TriggerProjection struct {
	Type  string
	Value string
}

// ProjectTrigger walks the graph, finds the entry/trigger node and projects its
// configured trigger onto the flat columns the runtime matches against.
//
// Resolution order for the entry node: a node of type "trigger" wins; otherwise
// the first "start"/"input" node. An absent/zero triggerType defaults to
// "keyword" (mirrors TriggerForm's default), which without a keyword degrades to
// a match-any message trigger.
//
// Returns an empty (zero) projection when no entry node exists — the caller then
// leaves the existing columns untouched (a graph with no trigger is simply not
// auto-startable, never an error here).
func ProjectTrigger(g FlowGraph) TriggerProjection {
	node, ok := entryNode(g)
	if !ok {
		return TriggerProjection{}
	}

	var d triggerNodeData
	if len(node.Data) > 0 {
		_ = json.Unmarshal(node.Data, &d)
	}

	switch strings.TrimSpace(d.TriggerType) {
	case "firstContact":
		return TriggerProjection{Type: TriggerWhatsAppFirstContact, Value: ""}
	case "any", "message":
		// Any inbound message starts the flow.
		return TriggerProjection{Type: TriggerWhatsAppMessage, Value: ""}
	case "keyword", "":
		// Keyword lives in the conditions builder. Extract the first textual
		// keyword (a contains/equals condition on the last input); fall back to
		// match-any when no keyword is configured.
		kw := extractKeyword(d)
		return TriggerProjection{Type: TriggerWhatsAppMessage, Value: kw}
	default:
		// Unknown trigger type (time/webhook/action) — not a message trigger,
		// so it is not projected onto the message-match columns.
		return TriggerProjection{}
	}
}

// entryNode returns the graph's trigger node, preferring an explicit "trigger"
// node over the canvas-seeded "start"/"input" entry node.
func entryNode(g FlowGraph) (Node, bool) {
	var start *Node
	for i := range g.Nodes {
		switch NodeType(g.Nodes[i].Type) {
		case NodeTrigger:
			return g.Nodes[i], true
		case NodeStart, NodeInput:
			if start == nil {
				start = &g.Nodes[i]
			}
		}
	}
	if start != nil {
		return *start, true
	}
	return Node{}, false
}

// extractKeyword pulls a normalized keyword from the trigger's conditions. It
// takes the value of the first condition that carries a non-empty value (the
// keyword builder uses field=lastInput, operator=contains/equals). The value is
// trimmed + lowercased so it matches the runtime's case-insensitive compare.
func extractKeyword(d triggerNodeData) string {
	for _, c := range d.Conditions {
		v := strings.TrimSpace(c.Value)
		if v != "" {
			return strings.ToLower(v)
		}
	}
	return ""
}
