package flow

import (
	"context"
	"encoding/json"
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
// DelLock actually clears the key so a retry can re-acquire (needed to assert the
// publish-failure lock-release path, H1).
type fakeRedis struct {
	locked   map[string]bool // keys already held => SetLock returns false
	setErr   error
	delErr   error
	delCalls []string // keys passed to DelLock, in order
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
func (r *fakeRedis) DelLock(key string) error {
	r.delCalls = append(r.delCalls, key)
	if r.delErr != nil {
		return r.delErr
	}
	delete(r.locked, key)
	return nil
}
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

// engineTextPayload mirrors engine-go internal/whatsapp.TextCommandPayload — the
// struct the engine unmarshals the command body into. sessionId is an int with
// NO `,string` tag, so a string sessionId in the payload makes this unmarshal
// fail in the engine (→ NACK, message never sent). This test reproduces the
// engine-side decode against the bytes the adapter actually publishes.
type engineTextPayload struct {
	SessionID int    `json:"sessionId"`
	MessageID string `json:"messageId"`
	To        string `json:"to"`
	Body      string `json:"body"`
}

func TestWhatsAppAdapter_PayloadSessionIDIsInt(t *testing.T) {
	pub := &fakePublisher{}
	a := NewWhatsAppAdapter(pub, newFakeRedis())

	msg := newMsg() // SessionID: "7"
	if err := a.Send(context.Background(), msg); err != nil {
		t.Fatalf("Send: %v", err)
	}
	cmd := pub.calls[0].payload.(map[string]interface{})

	// The engine decodes the *payload* object, so round-trip exactly that.
	raw, err := json.Marshal(cmd["payload"])
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	var decoded engineTextPayload
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatalf("engine-side unmarshal failed (sessionId not int?): %v; payload=%s", err, raw)
	}
	if decoded.SessionID != 7 {
		t.Fatalf("sessionId = %d, want 7 (string sessionId would NACK in engine)", decoded.SessionID)
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

// togglePublisher fails the first N PublishCommand calls, then succeeds — to
// simulate a transient AMQP outage followed by an AMQP redelivery/retry.
type togglePublisher struct {
	failFirst int
	calls     int
	published []struct {
		routingKey string
		payload    interface{}
	}
}

func (p *togglePublisher) PublishCommand(routingKey string, payload interface{}) error {
	p.calls++
	if p.calls <= p.failFirst {
		return errors.New("amqp down")
	}
	p.published = append(p.published, struct {
		routingKey string
		payload    interface{}
	}{routingKey, payload})
	return nil
}

// TestWhatsAppAdapter_PublishFailureReleasesLock pins H1: when PublishCommand
// fails, the dedup lock taken before it must be released, otherwise the AMQP
// redelivery (retry) hits the still-held lock and no-ops → message lost 24h.
func TestWhatsAppAdapter_PublishFailureReleasesLock(t *testing.T) {
	pub := &togglePublisher{failFirst: 1}
	red := newFakeRedis()
	a := NewWhatsAppAdapter(pub, red)
	msg := newMsg()

	// First attempt: publish fails → must return error AND release the lock.
	if err := a.Send(context.Background(), msg); err == nil {
		t.Fatal("expected publish error on first send")
	}
	if len(red.delCalls) != 1 || red.delCalls[0] != "wbot:msg:"+msg.EnvID {
		t.Fatalf("lock not released on publish failure; delCalls=%v", red.delCalls)
	}
	if red.locked["wbot:msg:"+msg.EnvID] {
		t.Fatal("dedup lock still held after publish failure — retry would no-op")
	}

	// Retry (AMQP redelivery): lock is free, publish now succeeds → message sent.
	if err := a.Send(context.Background(), msg); err != nil {
		t.Fatalf("retry after lock release should send, got %v", err)
	}
	if len(pub.published) != 1 {
		t.Fatalf("retry did not publish; published=%d", len(pub.published))
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
