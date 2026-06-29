package flow

import "testing"

// mustGraph parses node+edge JSON and fails the test on error.
func mustGraph(t *testing.T, nodesJSON, edgesJSON string) FlowGraph {
	t.Helper()
	g, err := ParseGraph([]byte(nodesJSON), []byte(edgesJSON))
	if err != nil {
		t.Fatalf("ParseGraph: %v", err)
	}
	return g
}

func TestProjectTrigger_Keyword(t *testing.T) {
	nodes := `[{"id":"n1","type":"trigger","data":{"triggerType":"keyword","conditions":[{"field":"lastInput","operator":"contains","value":" Oi "}]}}]`
	got := ProjectTrigger(mustGraph(t, nodes, "[]"))
	if got.Type != TriggerWhatsAppMessage {
		t.Fatalf("type = %q, want %q", got.Type, TriggerWhatsAppMessage)
	}
	if got.Value != "oi" {
		t.Fatalf("value = %q, want %q (trimmed+lowered)", got.Value, "oi")
	}
}

func TestProjectTrigger_AnyMessage(t *testing.T) {
	nodes := `[{"id":"n1","type":"trigger","data":{"triggerType":"any"}}]`
	got := ProjectTrigger(mustGraph(t, nodes, "[]"))
	if got.Type != TriggerWhatsAppMessage || got.Value != "" {
		t.Fatalf("got %+v, want {whatsapp_message, \"\"}", got)
	}
}

func TestProjectTrigger_FirstContact(t *testing.T) {
	nodes := `[{"id":"n1","type":"trigger","data":{"triggerType":"firstContact"}}]`
	got := ProjectTrigger(mustGraph(t, nodes, "[]"))
	if got.Type != TriggerWhatsAppFirstContact || got.Value != "" {
		t.Fatalf("got %+v, want {whatsapp_first_contact, \"\"}", got)
	}
}

// A start node with a keyword trigger is also projected (canvas seeds "start").
func TestProjectTrigger_StartNodeKeyword(t *testing.T) {
	nodes := `[{"id":"s","type":"start","data":{"triggerType":"keyword","conditions":[{"field":"lastInput","operator":"equals","value":"MENU"}]}},{"id":"m","type":"message","data":{}}]`
	got := ProjectTrigger(mustGraph(t, nodes, "[]"))
	if got.Type != TriggerWhatsAppMessage || got.Value != "menu" {
		t.Fatalf("got %+v, want {whatsapp_message, menu}", got)
	}
}

// The explicit trigger node wins over a start node when both are present.
func TestProjectTrigger_TriggerWinsOverStart(t *testing.T) {
	nodes := `[{"id":"s","type":"start","data":{"triggerType":"keyword","conditions":[{"field":"lastInput","operator":"equals","value":"start-kw"}]}},{"id":"t","type":"trigger","data":{"triggerType":"keyword","conditions":[{"field":"lastInput","operator":"equals","value":"trigger-kw"}]}}]`
	got := ProjectTrigger(mustGraph(t, nodes, "[]"))
	if got.Value != "trigger-kw" {
		t.Fatalf("value = %q, want trigger-kw (trigger node wins)", got.Value)
	}
}

func TestProjectTrigger_NoEntryNode(t *testing.T) {
	nodes := `[{"id":"m","type":"message","data":{}}]`
	got := ProjectTrigger(mustGraph(t, nodes, "[]"))
	if got.Type != "" || got.Value != "" {
		t.Fatalf("got %+v, want zero projection", got)
	}
}

// keyword type with no usable condition value degrades to match-any.
func TestProjectTrigger_KeywordNoValue(t *testing.T) {
	nodes := `[{"id":"t","type":"trigger","data":{"triggerType":"keyword","conditions":[{"field":"lastInput","operator":"isNotEmpty","value":""}]}}]`
	got := ProjectTrigger(mustGraph(t, nodes, "[]"))
	if got.Type != TriggerWhatsAppMessage || got.Value != "" {
		t.Fatalf("got %+v, want {whatsapp_message, \"\"}", got)
	}
}
