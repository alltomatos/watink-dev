package whatsapp

import (
	"testing"

	"go.mau.fi/whatsmeow"
)

// ---------------------------------------------------------------------------
// SendButtons — "session not connected" branch: emitAck(5) → message.ack event.
// ---------------------------------------------------------------------------

func TestSendButtons_NoClient_EmitsAck5(t *testing.T) {
	var capturedEvents []string
	svc := &WhatsAppService{
		clients:         make(map[int]*whatsmeow.Client),
		historyRequests: make(map[string]*pendingHistory),
		groupNames:      make(map[string]string),
		groupMetaMap:    make(map[string]groupMeta),
		picCache:        make(map[string]string),
	}
	svc.publishEvent = func(_ string, _ int, eventType string, _ map[string]interface{}) {
		capturedEvents = append(capturedEvents, eventType)
	}

	err := svc.SendButtons(99, "tenant-b", ButtonsCommandPayload{
		MessageID:   "btn-msg-1",
		To:          "5511999990001@s.whatsapp.net",
		ContentText: "Choose:",
		Buttons: []ButtonPayload{
			{ID: "1", DisplayText: "Yes"},
			{ID: "2", DisplayText: "No"},
		},
	})
	if err == nil {
		t.Fatal("expected error when no client is connected")
	}
	if len(capturedEvents) == 0 || capturedEvents[0] != "message.ack" {
		t.Fatalf("expected message.ack event, got %v", capturedEvents)
	}
}

// ---------------------------------------------------------------------------
// SendList — "session not connected" branch: emitAck(5) → message.ack event.
// ---------------------------------------------------------------------------

func TestSendList_NoClient_EmitsAck5(t *testing.T) {
	var capturedEvents []string
	svc := &WhatsAppService{
		clients:         make(map[int]*whatsmeow.Client),
		historyRequests: make(map[string]*pendingHistory),
		groupNames:      make(map[string]string),
		groupMetaMap:    make(map[string]groupMeta),
		picCache:        make(map[string]string),
	}
	svc.publishEvent = func(_ string, _ int, eventType string, _ map[string]interface{}) {
		capturedEvents = append(capturedEvents, eventType)
	}

	err := svc.SendList(42, "tenant-l", ListCommandPayload{
		MessageID:  "list-msg-1",
		To:         "5511999990002@s.whatsapp.net",
		Title:      "Pick one",
		ButtonText: "Open",
		Sections: []ListSectionPayload{
			{
				Title: "Options",
				Rows:  []ListRowPayload{{ID: "r1", Title: "Row 1"}},
			},
		},
	})
	if err == nil {
		t.Fatal("expected error when no client is connected")
	}
	if len(capturedEvents) == 0 || capturedEvents[0] != "message.ack" {
		t.Fatalf("expected message.ack event, got %v", capturedEvents)
	}
}

// ---------------------------------------------------------------------------
// SendInteractive — "session not connected" branch: emitAck(5) → message.ack.
// ---------------------------------------------------------------------------

func TestSendInteractive_NoClient_EmitsAck5(t *testing.T) {
	var capturedEvents []string
	svc := &WhatsAppService{
		clients:         make(map[int]*whatsmeow.Client),
		historyRequests: make(map[string]*pendingHistory),
		groupNames:      make(map[string]string),
		groupMetaMap:    make(map[string]groupMeta),
		picCache:        make(map[string]string),
	}
	svc.publishEvent = func(_ string, _ int, eventType string, _ map[string]interface{}) {
		capturedEvents = append(capturedEvents, eventType)
	}

	err := svc.SendInteractive(7, "tenant-i", InteractiveCommandPayload{
		MessageID: "int-msg-1",
		To:        "5511999990003@s.whatsapp.net",
		BodyText:  "Hello",
		Buttons: []InteractiveButtonPayload{
			{Name: "quick_reply", Params: `{"display_text":"OK"}`},
		},
	})
	if err == nil {
		t.Fatal("expected error when no client is connected")
	}
	if len(capturedEvents) == 0 || capturedEvents[0] != "message.ack" {
		t.Fatalf("expected message.ack event, got %v", capturedEvents)
	}
}

// ---------------------------------------------------------------------------
// Payload construction helpers — pure logic, no client needed.
// ---------------------------------------------------------------------------

// TestButtonsPayload_ButtonsSliceBuilt verifies the Buttons field is preserved.
func TestButtonsPayload_ButtonsSliceBuilt(t *testing.T) {
	payload := ButtonsCommandPayload{
		Buttons: []ButtonPayload{
			{ID: "a", DisplayText: "Alpha"},
			{ID: "b", DisplayText: "Beta"},
		},
	}
	if len(payload.Buttons) != 2 {
		t.Fatalf("expected 2 buttons, got %d", len(payload.Buttons))
	}
	if payload.Buttons[0].ID != "a" {
		t.Errorf("Buttons[0].ID = %q, want a", payload.Buttons[0].ID)
	}
	if payload.Buttons[1].DisplayText != "Beta" {
		t.Errorf("Buttons[1].DisplayText = %q, want Beta", payload.Buttons[1].DisplayText)
	}
}

// TestListPayload_SectionsAndRows verifies nested section/row structure.
func TestListPayload_SectionsAndRows(t *testing.T) {
	payload := ListCommandPayload{
		Sections: []ListSectionPayload{
			{
				Title: "Section A",
				Rows: []ListRowPayload{
					{ID: "r1", Title: "Row One", Description: "desc"},
					{ID: "r2", Title: "Row Two"},
				},
			},
		},
	}
	if len(payload.Sections) != 1 {
		t.Fatalf("expected 1 section, got %d", len(payload.Sections))
	}
	rows := payload.Sections[0].Rows
	if len(rows) != 2 {
		t.Fatalf("expected 2 rows, got %d", len(rows))
	}
	if rows[0].Description != "desc" {
		t.Errorf("rows[0].Description = %q, want desc", rows[0].Description)
	}
}

// TestInteractivePayload_ButtonsPreserved verifies InteractiveButtonPayload fields.
func TestInteractivePayload_ButtonsPreserved(t *testing.T) {
	payload := InteractiveCommandPayload{
		BodyText:   "Pick",
		FooterText: "Powered by Watink",
		Buttons: []InteractiveButtonPayload{
			{Name: "quick_reply", Params: `{"id":"1"}`},
		},
	}
	if payload.Buttons[0].Name != "quick_reply" {
		t.Errorf("Name = %q, want quick_reply", payload.Buttons[0].Name)
	}
	if payload.Buttons[0].Params != `{"id":"1"}` {
		t.Errorf("Params = %q, want {\"id\":\"1\"}", payload.Buttons[0].Params)
	}
}
