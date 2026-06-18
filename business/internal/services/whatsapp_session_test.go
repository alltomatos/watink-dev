package services

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// mockCommandPublisher is a test double for domain.CommandPublisher.
type mockCommandPublisher struct {
	lastRoutingKey string
	lastPayload    interface{}
}

func (m *mockCommandPublisher) PublishCommand(routingKey string, payload interface{}) error {
	m.lastRoutingKey = routingKey
	m.lastPayload = payload
	return nil
}

// mockRedisService is a test double for domain.RedisService.
type mockRedisService struct{}

func (m *mockRedisService) SetLock(key string, value string, expiration time.Duration) (bool, error) {
	return true, nil
}
func (m *mockRedisService) DelLock(key string) error                      { return nil }
func (m *mockRedisService) Subscribe(ctx context.Context, channel string) *redis.PubSub {
	return nil
}
func (m *mockRedisService) Publish(ctx context.Context, channel string, message interface{}) error {
	return nil
}
func (m *mockRedisService) Ping(ctx context.Context) error { return nil }

// Verify mocks satisfy interfaces at compile time.
var _ domain.CommandPublisher = (*mockCommandPublisher)(nil)
var _ domain.RedisService = (*mockRedisService)(nil)

func newTestWhatsAppSessionService(t *testing.T) *WhatsAppSessionService {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	pub := &mockCommandPublisher{}
	mockRedis := &mockRedisService{}
	mockBroadcast := NewRedisBroadcast(mockRedis, nil)

	return NewWhatsAppSessionService(db, pub, mockRedis, mockBroadcast)
}

func TestBuildDeleteSessionCommandPublishesDeletionIntent(t *testing.T) {
	wss := newTestWhatsAppSessionService(t)
	assertSessionCommand(t, wss, "session.delete")
}

func TestBuildSessionCommandPublishesStopIntent(t *testing.T) {
	wss := newTestWhatsAppSessionService(t)
	assertSessionCommand(t, wss, "session.stop")
}

// TestBuildDeleteSessionCommand_DelegatesToBuildSessionCommand tests buildDeleteSessionCommand directly.
func TestBuildDeleteSessionCommand_DelegatesToBuildSessionCommand(t *testing.T) {
	wss := newTestWhatsAppSessionService(t)
	tenantID := uuid.New()
	whatsapp := models.Whatsapp{ID: 7, TenantID: tenantID}

	routingKey, command := wss.buildDeleteSessionCommand(whatsapp)

	expectedKey := "wbot." + tenantID.String() + ".7.session.delete"
	if routingKey != expectedKey {
		t.Fatalf("routing key = %q, want %q", routingKey, expectedKey)
	}
	if command["type"] != "session.delete" {
		t.Fatalf("type = %v", command["type"])
	}
}

// TestPublishWhatsAppSessionCommand_DelegatesToPublisher verifies the publisher is called with the correct args.
func TestPublishWhatsAppSessionCommand_DelegatesToPublisher(t *testing.T) {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	pub := &mockCommandPublisher{}
	mockRedis := &mockRedisService{}
	mockBroadcast := NewRedisBroadcast(mockRedis, nil)
	wss := NewWhatsAppSessionService(db, pub, mockRedis, mockBroadcast)

	routingKey := "test.routing.key"
	command := map[string]interface{}{"type": "session.stop"}
	if err := wss.publishWhatsAppSessionCommand(routingKey, command); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if pub.lastRoutingKey != routingKey {
		t.Errorf("routing key = %q, want %q", pub.lastRoutingKey, routingKey)
	}
}

// TestStopWhatsAppSession_PublishesStop verifies StopWhatsAppSession publishes the right command.
func TestStopWhatsAppSession_PublishesStop(t *testing.T) {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	pub := &mockCommandPublisher{}
	mockRedis := &mockRedisService{}
	mockBroadcast := NewRedisBroadcast(mockRedis, nil)
	wss := NewWhatsAppSessionService(db, pub, mockRedis, mockBroadcast)

	tenantID := uuid.New()
	whatsapp := models.Whatsapp{ID: 99, TenantID: tenantID}

	if err := wss.StopWhatsAppSession(whatsapp); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expectedKey := "wbot." + tenantID.String() + ".99.session.stop"
	if pub.lastRoutingKey != expectedKey {
		t.Errorf("routing key = %q, want %q", pub.lastRoutingKey, expectedKey)
	}
}

// TestDeleteWhatsAppSession_PublishesDelete verifies DeleteWhatsAppSession publishes the right command.
func TestDeleteWhatsAppSession_PublishesDelete(t *testing.T) {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	pub := &mockCommandPublisher{}
	mockRedis := &mockRedisService{}
	mockBroadcast := NewRedisBroadcast(mockRedis, nil)
	wss := NewWhatsAppSessionService(db, pub, mockRedis, mockBroadcast)

	tenantID := uuid.New()
	whatsapp := models.Whatsapp{ID: 55, TenantID: tenantID}

	if err := wss.DeleteWhatsAppSession(whatsapp); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expectedKey := "wbot." + tenantID.String() + ".55.session.delete"
	if pub.lastRoutingKey != expectedKey {
		t.Errorf("routing key = %q, want %q", pub.lastRoutingKey, expectedKey)
	}
}

// TestLegacyGlobalFunctions_ReturnErrors ensures legacy functions fail closed.
func TestLegacyGlobalFunctions_ReturnErrors(t *testing.T) {
	w := models.Whatsapp{}
	if err := StartWhatsAppSession(w, false, "", false); err == nil {
		t.Error("legacy StartWhatsAppSession should return error")
	}
	if err := StopWhatsAppSession(w); err == nil {
		t.Error("legacy StopWhatsAppSession should return error")
	}
	if err := DeleteWhatsAppSession(w); err == nil {
		t.Error("legacy DeleteWhatsAppSession should return error")
	}
}

func assertSessionCommand(t *testing.T, wss *WhatsAppSessionService, commandType string) {
	t.Helper()
	tenantID := uuid.New()
	whatsapp := models.Whatsapp{ID: 42, TenantID: tenantID}

	routingKey, command := wss.buildSessionCommand(whatsapp, commandType)

	if routingKey != "wbot."+tenantID.String()+".42."+commandType {
		t.Fatalf("routing key = %q", routingKey)
	}
	if command["tenantId"] != tenantID {
		t.Fatalf("tenantId = %v", command["tenantId"])
	}
	if command["type"] != commandType {
		t.Fatalf("type = %v", command["type"])
	}

	payload, ok := command["payload"].(map[string]interface{})
	if !ok {
		t.Fatalf("payload type = %T", command["payload"])
	}
	if payload["sessionId"] != whatsapp.ID {
		t.Fatalf("sessionId = %v", payload["sessionId"])
	}

	if _, err := json.Marshal(command); err != nil {
		t.Fatalf("command must be JSON serializable: %v", err)
	}
}
