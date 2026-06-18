//go:build integration

package services

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
)

func redisURLForInteg(t *testing.T) string {
	t.Helper()
	if u := os.Getenv("REDIS_URL"); u != "" {
		return u
	}
	return "redis://localhost:6379"
}

func newTestRedis(t *testing.T) domain.RedisService {
	t.Helper()
	svc, err := domain.NewRedisService(domain.RedisServiceConfig{URL: redisURLForInteg(t)})
	if err != nil {
		t.Fatalf("NewRedisService() failed: %v", err)
	}
	return svc
}

func TestRedisService_Ping(t *testing.T) {
	svc := newTestRedis(t)
	if err := svc.Ping(context.Background()); err != nil {
		t.Fatalf("Ping() failed: %v", err)
	}
}

func TestRedisService_SetLock_And_DelLock(t *testing.T) {
	svc := newTestRedis(t)

	key := "integ:lock:test"
	ok, err := svc.SetLock(key, "owner-1", 5*time.Second)
	if err != nil {
		t.Fatalf("SetLock() failed: %v", err)
	}
	if !ok {
		t.Fatal("SetLock() returned false — lock should have been acquired")
	}

	// Second acquisition should fail (lock held)
	ok2, err := svc.SetLock(key, "owner-2", 5*time.Second)
	if err != nil {
		t.Fatalf("SetLock() second call failed: %v", err)
	}
	if ok2 {
		t.Error("SetLock() should return false when lock is already held")
	}

	// Release and verify re-acquisition succeeds
	if err := svc.DelLock(key); err != nil {
		t.Fatalf("DelLock() failed: %v", err)
	}

	ok3, err := svc.SetLock(key, "owner-3", 5*time.Second)
	if err != nil {
		t.Fatalf("SetLock() after DelLock failed: %v", err)
	}
	if !ok3 {
		t.Error("SetLock() should succeed after lock is released")
	}
	_ = svc.DelLock(key)
}

func TestRedisService_Publish_And_Subscribe(t *testing.T) {
	svc := newTestRedis(t)
	ctx := context.Background()

	channel := "integ:pubsub:test"
	sub := svc.Subscribe(ctx, channel)
	defer sub.Close()

	msg := "hello-integration"
	if err := svc.Publish(ctx, channel, msg); err != nil {
		t.Fatalf("Publish() failed: %v", err)
	}

	ch := sub.Channel()
	select {
	case m := <-ch:
		if m.Payload != msg {
			t.Errorf("expected %q, got %q", msg, m.Payload)
		}
	case <-time.After(3 * time.Second):
		t.Error("Subscribe() did not receive published message within timeout")
	}
}

func TestNewRedisServiceFromEnv(t *testing.T) {
	t.Setenv("REDIS_URL", redisURLForInteg(t))
	svc, err := NewRedisServiceFromEnv()
	if err != nil {
		t.Fatalf("NewRedisServiceFromEnv() failed: %v", err)
	}
	if err := svc.Ping(context.Background()); err != nil {
		t.Fatalf("Ping() after NewRedisServiceFromEnv() failed: %v", err)
	}
}
