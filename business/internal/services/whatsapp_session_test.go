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
