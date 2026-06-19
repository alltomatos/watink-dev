package whatsapp

import (
	"encoding/json"
	"testing"
)

func TestHistoryKey(t *testing.T) {
	got := historyKey(7, "5511999999999@s.whatsapp.net")
	want := "7:5511999999999@s.whatsapp.net"
	if got != want {
		t.Fatalf("historyKey = %q, want %q", got, want)
	}
}

func TestHistoryRecoverPayload_JSONRoundtrip(t *testing.T) {
	original := HistoryRecoverPayload{
		ChatJID:            "5511999999999@s.whatsapp.net",
		TicketID:           42,
		OldestMsgID:        "ABC123",
		OldestMsgFromMe:    true,
		OldestMsgTimestamp: 1_700_000_000,
		Count:              50,
		CutoffTimestamp:    1_699_000_000,
	}
	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var decoded HistoryRecoverPayload
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded != original {
		t.Fatalf("roundtrip mismatch: got %+v want %+v", decoded, original)
	}
}

func TestPendingHistory_Tracking(t *testing.T) {
	s := &WhatsAppService{historyRequests: make(map[string]*pendingHistory)}

	key := historyKey(1, "5511000@s.whatsapp.net")
	s.historyMu.Lock()
	s.historyRequests[key] = &pendingHistory{ticketID: 9, cutoff: 123}
	s.historyMu.Unlock()

	s.historyMu.Lock()
	p, ok := s.historyRequests[key]
	s.historyMu.Unlock()
	if !ok || p.ticketID != 9 || p.cutoff != 123 {
		t.Fatalf("pending history not tracked correctly: %+v ok=%v", p, ok)
	}
}
