package whatsapp

import (
	"sync"
	"testing"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

// publishedCall records a single call to the publishEvent spy.
type publishedCall struct {
	tenantID  string
	sessionID int
	eventType string
	payload   map[string]interface{}
}

// newTestService returns a minimal WhatsAppService with a spy publishEvent.
// No Postgres, no RabbitMQ — safe for offline unit tests.
func newTestService() (*WhatsAppService, *[]publishedCall) {
	calls := &[]publishedCall{}
	var mu sync.Mutex
	svc := &WhatsAppService{
		clients:      make(map[int]*whatsmeow.Client),
		groupNames:   make(map[string]string),
		groupMetaMap: make(map[string]groupMeta),
		picCache:     make(map[string]string),
	}
	svc.publishEvent = func(tenantID string, sessionID int, eventType string, payload map[string]interface{}) {
		mu.Lock()
		defer mu.Unlock()
		*calls = append(*calls, publishedCall{tenantID, sessionID, eventType, payload})
	}
	return svc, calls
}

// ---------------------------------------------------------------------------
// a) TestReceiptAck_KnownTypes
// ---------------------------------------------------------------------------

func TestReceiptAck_KnownTypes(t *testing.T) {
	tests := []struct {
		name        string
		receiptType types.ReceiptType
		wantAck     int
	}{
		{"Delivered", types.ReceiptTypeDelivered, 2},
		{"Read", types.ReceiptTypeRead, 3},
		{"Played", types.ReceiptTypePlayed, 4},
		{"Unknown/other", types.ReceiptType("unknown"), 1},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got := receiptAck(tc.receiptType)
			if got != tc.wantAck {
				t.Fatalf("receiptAck(%q) = %d, want %d", tc.receiptType, got, tc.wantAck)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// b) TestHandleContactEvent_PublishesUpdate
// ---------------------------------------------------------------------------

func TestHandleContactEvent_PublishesUpdate(t *testing.T) {
	svc, calls := newTestService()

	jid, err := types.ParseJID("5511999990001@s.whatsapp.net")
	if err != nil {
		t.Fatalf("ParseJID: %v", err)
	}

	evt := &events.Contact{
		JID:    jid,
		Action: nil, // no Action → pushName stays ""
	}
	svc.handleContactEvent(1, "tenant-x", evt)

	if len(*calls) != 1 {
		t.Fatalf("expected 1 call, got %d", len(*calls))
	}
	c := (*calls)[0]
	if c.eventType != "contact.update" {
		t.Errorf("eventType = %q, want contact.update", c.eventType)
	}
	if c.tenantID != "tenant-x" {
		t.Errorf("tenantID = %q, want tenant-x", c.tenantID)
	}
	contact, ok := c.payload["contact"].(map[string]interface{})
	if !ok {
		t.Fatalf("payload[contact] missing or wrong type")
	}
	if contact["jid"] != jid.String() {
		t.Errorf("contact.jid = %q, want %q", contact["jid"], jid.String())
	}
}

// ---------------------------------------------------------------------------
// c) TestHandleReceiptEvent_AcksAllIDs
// ---------------------------------------------------------------------------

func TestHandleReceiptEvent_AcksAllIDs(t *testing.T) {
	svc, calls := newTestService()

	chat, err := types.ParseJID("5511999990002@s.whatsapp.net")
	if err != nil {
		t.Fatalf("ParseJID: %v", err)
	}

	evt := &events.Receipt{
		MessageSource: types.MessageSource{Chat: chat},
		MessageIDs:    []types.MessageID{"msg-1", "msg-2", "msg-3"},
		Type:          types.ReceiptTypeRead,
	}
	svc.handleReceiptEvent(2, "tenant-y", evt)

	if len(*calls) != 3 {
		t.Fatalf("expected 3 calls (one per messageID), got %d", len(*calls))
	}
	for i, c := range *calls {
		if c.eventType != "message.ack" {
			t.Errorf("call[%d]: eventType = %q, want message.ack", i, c.eventType)
		}
		if c.payload["ack"] != 3 {
			t.Errorf("call[%d]: ack = %v, want 3 (Read)", i, c.payload["ack"])
		}
	}
}

// ---------------------------------------------------------------------------
// d) TestGroupSubject_CachesResult — via cachedGroupMeta (no real client needed)
// ---------------------------------------------------------------------------

func TestGroupSubject_CachesResult(t *testing.T) {
	svc, _ := newTestService()

	jid, err := types.ParseJID("120363000000000001@g.us")
	if err != nil {
		t.Fatalf("ParseJID: %v", err)
	}

	// Pre-populate the groupNames and groupMetaMap caches to simulate
	// a prior successful GetGroupInfo call (without a real whatsmeow client).
	key := jid.String()
	svc.groupNameMu.Lock()
	svc.groupNames[key] = "Cached Group Name"
	svc.groupNameMu.Unlock()

	svc.groupMetaMu.Lock()
	svc.groupMetaMap[key] = groupMeta{isCommunity: true, isSubGroup: false}
	svc.groupMetaMu.Unlock()

	// cachedGroupMeta must return the pre-populated value without any client call.
	meta := svc.cachedGroupMeta(jid)
	if !meta.isCommunity {
		t.Error("expected isCommunity=true from cache")
	}
	if meta.isSubGroup {
		t.Error("expected isSubGroup=false from cache")
	}

	// groupNames cache must also hold the cached name.
	svc.groupNameMu.Lock()
	cached, ok := svc.groupNames[key]
	svc.groupNameMu.Unlock()
	if !ok || cached != "Cached Group Name" {
		t.Errorf("groupNames cache = %q, want 'Cached Group Name'", cached)
	}
}

// ---------------------------------------------------------------------------
// e) TestCachedGroupMeta_ZeroValueWhenEmpty
// ---------------------------------------------------------------------------

func TestCachedGroupMeta_ZeroValueWhenEmpty(t *testing.T) {
	svc, _ := newTestService()

	jid, err := types.ParseJID("120363000000000099@g.us")
	if err != nil {
		t.Fatalf("ParseJID: %v", err)
	}

	meta := svc.cachedGroupMeta(jid)
	if meta.isCommunity || meta.isSubGroup {
		t.Errorf("expected zero groupMeta for unknown JID, got %+v", meta)
	}
}
