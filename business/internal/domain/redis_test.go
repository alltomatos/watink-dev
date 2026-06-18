package domain

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

// mockRedisService is a local mock of the RedisService interface used to verify
// the contract without requiring a real Redis connection.
type mockRedisService struct {
	setLockFn   func(key, value string, expiration time.Duration) (bool, error)
	delLockFn   func(key string) error
	subscribeFn func(ctx context.Context, channel string) *redis.PubSub
	publishFn   func(ctx context.Context, channel string, message interface{}) error
	pingFn      func(ctx context.Context) error
}

func (m *mockRedisService) SetLock(key, value string, expiration time.Duration) (bool, error) {
	return m.setLockFn(key, value, expiration)
}
func (m *mockRedisService) DelLock(key string) error {
	return m.delLockFn(key)
}
func (m *mockRedisService) Subscribe(ctx context.Context, channel string) *redis.PubSub {
	return m.subscribeFn(ctx, channel)
}
func (m *mockRedisService) Publish(ctx context.Context, channel string, message interface{}) error {
	return m.publishFn(ctx, channel, message)
}
func (m *mockRedisService) Ping(ctx context.Context) error {
	return m.pingFn(ctx)
}

// Compile-time assertion that mockRedisService satisfies RedisService.
var _ RedisService = (*mockRedisService)(nil)

func TestRedisServiceInterface_SetLock(t *testing.T) {
	var capturedKey, capturedValue string
	var capturedExpiration time.Duration

	svc := &mockRedisService{
		setLockFn: func(key, value string, expiration time.Duration) (bool, error) {
			capturedKey = key
			capturedValue = value
			capturedExpiration = expiration
			return true, nil
		},
	}

	acquired, err := svc.SetLock("lock:ticket:1", "owner-1", 10*time.Second)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !acquired {
		t.Error("expected lock to be acquired")
	}
	if capturedKey != "lock:ticket:1" {
		t.Errorf("expected key 'lock:ticket:1', got %s", capturedKey)
	}
	if capturedValue != "owner-1" {
		t.Errorf("expected value 'owner-1', got %s", capturedValue)
	}
	if capturedExpiration != 10*time.Second {
		t.Errorf("expected expiration 10s, got %v", capturedExpiration)
	}
}

func TestRedisServiceInterface_SetLock_AlreadyAcquired(t *testing.T) {
	svc := &mockRedisService{
		setLockFn: func(key, value string, expiration time.Duration) (bool, error) {
			return false, nil
		},
	}
	acquired, err := svc.SetLock("lock:ticket:1", "owner-2", 5*time.Second)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if acquired {
		t.Error("expected lock NOT to be acquired when already held")
	}
}

func TestRedisServiceInterface_SetLock_Error(t *testing.T) {
	want := errors.New("redis unavailable")
	svc := &mockRedisService{
		setLockFn: func(key, value string, expiration time.Duration) (bool, error) {
			return false, want
		},
	}
	_, err := svc.SetLock("key", "val", time.Second)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestRedisServiceInterface_DelLock(t *testing.T) {
	var capturedKey string
	svc := &mockRedisService{
		delLockFn: func(key string) error {
			capturedKey = key
			return nil
		},
	}
	if err := svc.DelLock("lock:ticket:1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedKey != "lock:ticket:1" {
		t.Errorf("expected key 'lock:ticket:1', got %s", capturedKey)
	}
}

func TestRedisServiceInterface_DelLock_Error(t *testing.T) {
	want := errors.New("del failed")
	svc := &mockRedisService{
		delLockFn: func(key string) error { return want },
	}
	if err := svc.DelLock("key"); !errors.Is(err, want) {
		t.Errorf("expected error %v, got %v", want, err)
	}
}

func TestRedisServiceInterface_Publish(t *testing.T) {
	var capturedChannel string
	var capturedMessage interface{}
	svc := &mockRedisService{
		publishFn: func(ctx context.Context, channel string, message interface{}) error {
			capturedChannel = channel
			capturedMessage = message
			return nil
		},
	}
	ctx := context.Background()
	if err := svc.Publish(ctx, "events:ticket", "payload"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedChannel != "events:ticket" {
		t.Errorf("expected channel 'events:ticket', got %s", capturedChannel)
	}
	if capturedMessage != "payload" {
		t.Errorf("expected message 'payload', got %v", capturedMessage)
	}
}

func TestRedisServiceInterface_Publish_Error(t *testing.T) {
	want := errors.New("publish failed")
	svc := &mockRedisService{
		publishFn: func(ctx context.Context, channel string, message interface{}) error {
			return want
		},
	}
	err := svc.Publish(context.Background(), "ch", "msg")
	if !errors.Is(err, want) {
		t.Errorf("expected error %v, got %v", want, err)
	}
}

func TestRedisServiceInterface_Subscribe(t *testing.T) {
	svc := &mockRedisService{
		subscribeFn: func(ctx context.Context, channel string) *redis.PubSub {
			// Return nil to signal the subscribe was called; in real usage the
			// caller receives a *redis.PubSub from the real client.
			return nil
		},
	}
	ps := svc.Subscribe(context.Background(), "events:ticket")
	// nil is acceptable from mock — we're verifying the method signature/contract
	_ = ps
}

func TestRedisServiceInterface_Ping(t *testing.T) {
	svc := &mockRedisService{
		pingFn: func(ctx context.Context) error { return nil },
	}
	if err := svc.Ping(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRedisServiceInterface_Ping_Error(t *testing.T) {
	want := errors.New("connection refused")
	svc := &mockRedisService{
		pingFn: func(ctx context.Context) error { return want },
	}
	if err := svc.Ping(context.Background()); !errors.Is(err, want) {
		t.Errorf("expected error %v, got %v", want, err)
	}
}

func TestRedisServiceConfig(t *testing.T) {
	cfg := RedisServiceConfig{URL: "redis://localhost:6379/0"}
	if cfg.URL != "redis://localhost:6379/0" {
		t.Errorf("unexpected URL: %s", cfg.URL)
	}
}
