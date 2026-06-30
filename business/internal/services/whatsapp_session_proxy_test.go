package services

import (
	"os"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/alltomatos/watinkdev/business/pkg/cryptobox"
	"github.com/google/uuid"
)

func init() {
	// cryptobox caches the key via sync.Once on first use; set it before any
	// Encrypt/Decrypt in this test binary.
	_ = os.Setenv(cryptobox.EnvKey, "services-proxy-test-secret-key")
}

func startPayload(t *testing.T, pub *mockCommandPublisher) map[string]interface{} {
	t.Helper()
	cmd, ok := pub.lastPayload.(map[string]interface{})
	if !ok {
		t.Fatalf("payload is not map[string]interface{}, got %T", pub.lastPayload)
	}
	payload, ok := cmd["payload"].(map[string]interface{})
	if !ok {
		t.Fatalf("payload.payload is not a map")
	}
	return payload
}

// Proxy assigned (single) → payload carries the composed scheme://user:pass@host:port.
func TestStartWhatsAppSession_ComposesProxyURL(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()

	enc, err := cryptobox.Encrypt("bvnf3gpk9utd")
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	proxy := models.Proxy{
		TenantID: tenantID, Scheme: "socks5", Host: "38.154.193.44", Port: 5317,
		Username: "kpofqjyb", PasswordEnc: enc, Status: "active",
	}
	if err := db.Create(&proxy).Error; err != nil {
		t.Fatalf("seed proxy: %v", err)
	}
	w := models.Whatsapp{ID: 1, TenantID: tenantID, Name: "s", ProxyMode: "single", ProxyID: &proxy.ID}
	if err := db.Create(&w).Error; err != nil {
		t.Fatalf("seed whatsapp: %v", err)
	}

	pub := &mockCommandPublisher{}
	mockRedis := &mockRedisService{}
	wss := NewWhatsAppSessionService(db, pub, mockRedis, NewRedisBroadcast(mockRedis, nil))

	if err := wss.StartWhatsAppSession(w, false, "", false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	got := startPayload(t, pub)["proxyUrl"]
	want := "socks5://kpofqjyb:bvnf3gpk9utd@38.154.193.44:5317"
	if got != want {
		t.Fatalf("proxyUrl = %v, want %v", got, want)
	}
}

// No proxy assigned → payload proxyUrl is empty (no regression for direct conns).
func TestStartWhatsAppSession_NoProxy_EmptyURL(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	w := models.Whatsapp{ID: 1, TenantID: tenantID, Name: "s"}
	if err := db.Create(&w).Error; err != nil {
		t.Fatalf("seed: %v", err)
	}
	pub := &mockCommandPublisher{}
	mockRedis := &mockRedisService{}
	wss := NewWhatsAppSessionService(db, pub, mockRedis, NewRedisBroadcast(mockRedis, nil))

	if err := wss.StartWhatsAppSession(w, false, "", false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := startPayload(t, pub)["proxyUrl"]; got != "" {
		t.Fatalf("proxyUrl = %v, want empty", got)
	}
}

// Proxy assigned but isolated → fail-closed: the session must NOT start (no IP leak).
func TestStartWhatsAppSession_InactiveProxy_FailsClosed(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	enc, _ := cryptobox.Encrypt("p")
	proxy := models.Proxy{TenantID: tenantID, Scheme: "http", Host: "h", Port: 8080, PasswordEnc: enc, Status: "isolated"}
	if err := db.Create(&proxy).Error; err != nil {
		t.Fatalf("seed proxy: %v", err)
	}
	w := models.Whatsapp{ID: 1, TenantID: tenantID, Name: "s", ProxyMode: "single", ProxyID: &proxy.ID}
	if err := db.Create(&w).Error; err != nil {
		t.Fatalf("seed whatsapp: %v", err)
	}
	pub := &mockCommandPublisher{}
	mockRedis := &mockRedisService{}
	wss := NewWhatsAppSessionService(db, pub, mockRedis, NewRedisBroadcast(mockRedis, nil))

	if err := wss.StartWhatsAppSession(w, false, "", false); err == nil {
		t.Fatal("expected fail-closed error for isolated proxy, got nil")
	}
	if pub.lastPayload != nil {
		t.Fatal("no command should be published when proxy is unusable")
	}
}
