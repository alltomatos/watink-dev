package services

import (
	"context"
	"encoding/json"
	"testing"
)

func TestSocketMessage_JSONRoundTrip(t *testing.T) {
	sm := SocketMessage{
		SourceID:  "node-abc",
		Namespace: "/tenant-1",
		Room:      "room-42",
		Event:     "ticket:update",
		Payload:   map[string]interface{}{"id": float64(99)},
	}

	data, err := json.Marshal(sm)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var sm2 SocketMessage
	if err := json.Unmarshal(data, &sm2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if sm2.SourceID != sm.SourceID {
		t.Fatalf("SourceID: got %q, want %q", sm2.SourceID, sm.SourceID)
	}
	if sm2.Namespace != sm.Namespace {
		t.Fatalf("Namespace: got %q", sm2.Namespace)
	}
	if sm2.Room != sm.Room {
		t.Fatalf("Room: got %q", sm2.Room)
	}
	if sm2.Event != sm.Event {
		t.Fatalf("Event: got %q", sm2.Event)
	}
}

func TestNewRedisBroadcast_NotNil(t *testing.T) {
	rb := NewRedisBroadcast(&mockRedisService{}, nil)
	if rb == nil {
		t.Fatal("NewRedisBroadcast must not return nil")
	}
}

func TestRedisBroadcast_EmitToNamespace_NilSafe(t *testing.T) {
	// Should not panic when rb is nil (safety check in EmitToNamespace)
	var rb *RedisBroadcast
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("EmitToNamespace panicked on nil receiver: %v", r)
		}
	}()
	rb.EmitToNamespace("/test", "evt", nil)
}

func TestRedisBroadcast_Publish_SetsSourceID(t *testing.T) {
	captured := &captureRedisService{}
	rb := NewRedisBroadcast(captured, nil)

	rb.Publish(SocketMessage{
		Namespace: "/ns",
		Event:     "ping",
	})

	if captured.lastChannel != "socketio:broadcast" {
		t.Fatalf("channel: got %q", captured.lastChannel)
	}

	// Parse what was published and verify SourceID is set to NodeID
	raw, ok := captured.lastPayload.([]byte)
	if !ok {
		t.Fatalf("payload type: %T", captured.lastPayload)
	}
	var sm SocketMessage
	if err := json.Unmarshal(raw, &sm); err != nil {
		t.Fatalf("unmarshal published payload: %v", err)
	}
	if sm.SourceID != NodeID {
		t.Fatalf("SourceID: got %q, want %q", sm.SourceID, NodeID)
	}
	if sm.Event != "ping" {
		t.Fatalf("Event: got %q", sm.Event)
	}
}

// captureRedisService captures Publish calls for inspection.
type captureRedisService struct {
	mockRedisService
	lastChannel string
	lastPayload interface{}
}

func (c *captureRedisService) Publish(ctx context.Context, channel string, message interface{}) error {
	c.lastChannel = channel
	c.lastPayload = message
	return nil
}
