package whatsapp

import (
	"encoding/json"
	"testing"
)

func TestTextCommandPayload_JSONRoundtrip(t *testing.T) {
	original := TextCommandPayload{
		SessionID:   1,
		MessageID:   "msg-001",
		To:          "5511999999999@s.whatsapp.net",
		Body:        "Hello",
		QuotedMsgID: "quoted-001",
		Mentions:    []string{"5511888888888@s.whatsapp.net"},
	}
	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var decoded TextCommandPayload
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded.SessionID != original.SessionID || decoded.Body != original.Body || decoded.To != original.To {
		t.Errorf("roundtrip mismatch: got %+v", decoded)
	}
}

func TestTextCommandPayload_OmitsEmptyOptionals(t *testing.T) {
	p := TextCommandPayload{SessionID: 2, MessageID: "m", To: "jid", Body: "hi"}
	data, _ := json.Marshal(p)
	var m map[string]interface{}
	json.Unmarshal(data, &m)
	if _, ok := m["quotedMsgId"]; ok {
		t.Error("quotedMsgId should be omitted when empty")
	}
	if _, ok := m["mentions"]; ok {
		t.Error("mentions should be omitted when nil")
	}
}

func TestMediaCommandPayload_JSONRoundtrip(t *testing.T) {
	original := MediaCommandPayload{
		SessionID: 1, MessageID: "m2", To: "jid",
		MediaURL: "https://example.com/img.png", MediaType: "image",
		MimeType: "image/png", FileName: "img.png",
	}
	data, _ := json.Marshal(original)
	var decoded MediaCommandPayload
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded.MediaURL != original.MediaURL || decoded.MimeType != original.MimeType {
		t.Errorf("roundtrip mismatch: got %+v", decoded)
	}
}

func TestPollCommandPayload_JSONRoundtrip(t *testing.T) {
	original := PollCommandPayload{
		SessionID:       "sess-1",
		MessageID:       "poll-001",
		To:              "group@g.us",
		Name:            "Best option?",
		Options:         []string{"A", "B", "C"},
		SelectableCount: 1,
	}
	data, _ := json.Marshal(original)
	var decoded PollCommandPayload
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(decoded.Options) != 3 || decoded.SelectableCount != 1 {
		t.Errorf("roundtrip mismatch: got %+v", decoded)
	}
}

func TestMarkReadCommandPayload_JSONRoundtrip(t *testing.T) {
	original := MarkReadCommandPayload{
		ChatJID:    "chat@s.whatsapp.net",
		SenderJID:  "sender@s.whatsapp.net",
		MessageIDs: []string{"id1", "id2"},
	}
	data, _ := json.Marshal(original)
	var decoded MarkReadCommandPayload
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(decoded.MessageIDs) != 2 {
		t.Errorf("want 2 message IDs, got %d", len(decoded.MessageIDs))
	}
}

func TestSyncContactPayload_JSONRoundtrip(t *testing.T) {
	original := SyncContactPayload{SessionID: "sess-2", Number: "5511777777777"}
	data, _ := json.Marshal(original)
	var decoded SyncContactPayload
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded.Number != original.Number {
		t.Errorf("want %s, got %s", original.Number, decoded.Number)
	}
}

func TestListCommandPayload_SectionsRoundtrip(t *testing.T) {
	original := ListCommandPayload{
		To: "jid", Title: "Menu",
		Sections: []ListSectionPayload{
			{Title: "Sec1", Rows: []ListRowPayload{{ID: "r1", Title: "Row1"}}},
		},
	}
	data, _ := json.Marshal(original)
	var decoded ListCommandPayload
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(decoded.Sections) != 1 || len(decoded.Sections[0].Rows) != 1 {
		t.Errorf("sections roundtrip failed: %+v", decoded.Sections)
	}
}
