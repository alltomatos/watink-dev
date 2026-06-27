package flow

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// --- local mocks (no globals; per ADR 0006 test policy) ---

type fakePublisher struct {
	calls []struct {
		routingKey string
		payload    interface{}
	}
	err error
}

func (p *fakePublisher) PublishCommand(routingKey string, payload interface{}) error {
	if p.err != nil {
		return p.err
	}
	p.calls = append(p.calls, struct {
		routingKey string
		payload    interface{}
	}{routingKey, payload})
	return nil
}

// fakeRedis records SetLock and returns a configurable acquired/err per key.
type fakeRedis struct {
	locked map[string]bool // keys already held => SetLock returns false
	setErr error
}

func newFakeRedis() *fakeRedis { return &fakeRedis{locked: map[string]bool{}} }

func (r *fakeRedis) SetLock(key, value string, expiration time.Duration) (bool, error) {
	if r.setErr != nil {
		return false, r.setErr
	}
	if r.locked[key] {
		return false, nil
	}
	r.locked[key] = true
	return true, nil
}
func (r *fakeRedis) DelLock(string) error                               { return nil }
func (r *fakeRedis) Subscribe(context.Context, string) *redis.PubSub    { return nil }
func (r *fakeRedis) Publish(context.Context, string, interface{}) error { return nil }
func (r *fakeRedis) Ping(context.Context) error                         { return nil }
func (r *fakeRedis) Get(context.Context, string) (string, error)        { return "", nil }

func newMsg() OutboundMessage {
	return OutboundMessage{
		TenantID:  uuid.New(),
		EnvID:     "ENV-1",
		To:        "5511999@s.whatsapp.net",
		SessionID: "7",
		Body:      "hello",
	}
}

func TestWhatsAppAdapter_SendPublishesTextCommand(t *testing.T) {
	pub := &fakePublisher{}
	red := newFakeRedis()
	a := NewWhatsAppAdapter(pub, red)

	msg := newMsg()
	if err := a.Send(context.Background(), msg); err != nil {
		t.Fatalf("Send: %v", err)
	}
	if len(pub.calls) != 1 {
		t.Fatalf("expected 1 publish, got %d", len(pub.calls))
	}
	cmd, ok := pub.calls[0].payload.(map[string]interface{})
	if !ok || cmd["type"] != "message.send.text" {
		t.Fatalf("unexpected command payload: %+v", pub.calls[0].payload)
	}
	wantKey := "wbot." + msg.TenantID.String() + ".7.message.send.text"
	if pub.calls[0].routingKey != wantKey {
		t.Fatalf("routingKey = %q, want %q", pub.calls[0].routingKey, wantKey)
	}
}

func TestWhatsAppAdapter_DedupSkipsSecondSend(t *testing.T) {
	pub := &fakePublisher{}
	red := newFakeRedis()
	a := NewWhatsAppAdapter(pub, red)

	msg := newMsg()
	_ = a.Send(context.Background(), msg)
	if err := a.Send(context.Background(), msg); err != nil {
		t.Fatalf("second Send (dedup) should be nil, got %v", err)
	}
	if len(pub.calls) != 1 {
		t.Fatalf("dedup failed: expected 1 publish, got %d", len(pub.calls))
	}
}

func TestWhatsAppAdapter_MediaCommand(t *testing.T) {
	pub := &fakePublisher{}
	a := NewWhatsAppAdapter(pub, newFakeRedis())

	msg := newMsg()
	msg.Meta = map[string]any{"mediaUrl": "https://x/y.jpg", "mediaType": "image", "mimeType": "image/jpeg"}
	if err := a.Send(context.Background(), msg); err != nil {
		t.Fatalf("Send: %v", err)
	}
	cmd := pub.calls[0].payload.(map[string]interface{})
	if cmd["type"] != "message.send.media" {
		t.Fatalf("type = %v, want message.send.media", cmd["type"])
	}
}

func TestWhatsAppAdapter_DedupLockError(t *testing.T) {
	red := newFakeRedis()
	red.setErr = errors.New("redis down")
	a := NewWhatsAppAdapter(&fakePublisher{}, red)
	if err := a.Send(context.Background(), newMsg()); err == nil {
		t.Fatal("expected error when dedup lock fails")
	}
}

func TestWhatsAppAdapter_ValidatesAddressing(t *testing.T) {
	a := NewWhatsAppAdapter(&fakePublisher{}, newFakeRedis())
	noTo := newMsg()
	noTo.To = ""
	if err := a.Send(context.Background(), noTo); err == nil {
		t.Fatal("expected error for empty To")
	}
	noSess := newMsg()
	noSess.SessionID = ""
	if err := a.Send(context.Background(), noSess); err == nil {
		t.Fatal("expected error for empty SessionID")
	}
}

func TestWhatsAppAdapter_RegistersInRegistry(t *testing.T) {
	reg := NewChannelRegistry()
	reg.Register(NewWhatsAppAdapter(&fakePublisher{}, newFakeRedis()))
	got, err := reg.MustGet("whatsapp")
	if err != nil || got.Channel() != "whatsapp" {
		t.Fatalf("registry lookup failed: %v / %v", got, err)
	}
}
