package services

import (
	"os"
	"testing"
	"time"

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

// Group sticky: picks the least-recently-used active proxy and persists it as
// the connection's sticky proxyId.
func TestPickGroupProxy_StickyLRU(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	group := models.ProxyGroup{TenantID: tenantID, Name: "g", RotationStrategy: "sticky"}
	if err := db.Create(&group).Error; err != nil {
		t.Fatalf("seed group: %v", err)
	}
	old := time.Now().Add(-1 * time.Hour)
	newer := time.Now()
	pA := models.Proxy{TenantID: tenantID, Scheme: "http", Host: "a", Port: 1, Status: "active", ProxyGroupID: &group.ID, LastUsedAt: &old}
	pB := models.Proxy{TenantID: tenantID, Scheme: "http", Host: "b", Port: 2, Status: "active", ProxyGroupID: &group.ID, LastUsedAt: &newer}
	if err := db.Create(&pA).Error; err != nil {
		t.Fatalf("seed pA: %v", err)
	}
	if err := db.Create(&pB).Error; err != nil {
		t.Fatalf("seed pB: %v", err)
	}
	w := models.Whatsapp{ID: 1, TenantID: tenantID, Name: "s", ProxyMode: "group", ProxyGroupID: &group.ID}
	if err := db.Create(&w).Error; err != nil {
		t.Fatalf("seed w: %v", err)
	}

	pub := &mockCommandPublisher{}
	mockRedis := &mockRedisService{}
	wss := NewWhatsAppSessionService(db, pub, mockRedis, NewRedisBroadcast(mockRedis, nil))
	if err := wss.StartWhatsAppSession(w, false, "", false); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := startPayload(t, pub)["proxyUrl"]; got != "http://a:1" {
		t.Fatalf("LRU should pick pA (oldest), got %v", got)
	}
	var reloaded models.Whatsapp
	db.Where("id = ?", w.ID).First(&reloaded)
	if reloaded.ProxyID == nil || *reloaded.ProxyID != pA.ID {
		t.Fatalf("sticky proxyId not persisted (want %d): %v", pA.ID, reloaded.ProxyID)
	}
}

// Group rotate: each (re)connect advances to the next least-recently-used proxy.
func TestPickGroupProxy_Rotate(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	group := models.ProxyGroup{TenantID: tenantID, Name: "g", RotationStrategy: "rotate"}
	if err := db.Create(&group).Error; err != nil {
		t.Fatalf("seed group: %v", err)
	}
	old := time.Now().Add(-1 * time.Hour)
	newer := time.Now().Add(-1 * time.Minute)
	pA := models.Proxy{TenantID: tenantID, Scheme: "http", Host: "a", Port: 1, Status: "active", ProxyGroupID: &group.ID, LastUsedAt: &old}
	pB := models.Proxy{TenantID: tenantID, Scheme: "http", Host: "b", Port: 2, Status: "active", ProxyGroupID: &group.ID, LastUsedAt: &newer}
	db.Create(&pA)
	db.Create(&pB)
	w := models.Whatsapp{ID: 1, TenantID: tenantID, Name: "s", ProxyMode: "group", ProxyGroupID: &group.ID}
	db.Create(&w)

	pub := &mockCommandPublisher{}
	mockRedis := &mockRedisService{}
	wss := NewWhatsAppSessionService(db, pub, mockRedis, NewRedisBroadcast(mockRedis, nil))

	// First connect → LRU is pA.
	if err := wss.StartWhatsAppSession(w, false, "", false); err != nil {
		t.Fatalf("first start: %v", err)
	}
	if got := startPayload(t, pub)["proxyUrl"]; got != "http://a:1" {
		t.Fatalf("first rotate pick should be pA, got %v", got)
	}
	// Second connect → pA was just bumped, so pB is now LRU.
	if err := wss.StartWhatsAppSession(w, false, "", false); err != nil {
		t.Fatalf("second start: %v", err)
	}
	if got := startPayload(t, pub)["proxyUrl"]; got != "http://b:2" {
		t.Fatalf("second rotate pick should advance to pB, got %v", got)
	}
}

// Group with no active proxies (all isolated) → fail-closed.
func TestPickGroupProxy_NoActive_FailsClosed(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	group := models.ProxyGroup{TenantID: tenantID, Name: "g", RotationStrategy: "sticky"}
	db.Create(&group)
	p := models.Proxy{TenantID: tenantID, Scheme: "http", Host: "a", Port: 1, Status: "isolated", ProxyGroupID: &group.ID}
	db.Create(&p)
	w := models.Whatsapp{ID: 1, TenantID: tenantID, Name: "s", ProxyMode: "group", ProxyGroupID: &group.ID}
	db.Create(&w)

	pub := &mockCommandPublisher{}
	mockRedis := &mockRedisService{}
	wss := NewWhatsAppSessionService(db, pub, mockRedis, NewRedisBroadcast(mockRedis, nil))
	if err := wss.StartWhatsAppSession(w, false, "", false); err == nil {
		t.Fatal("expected fail-closed error when group has no active proxy")
	}
	if pub.lastPayload != nil {
		t.Fatal("no command should be published when group is empty")
	}
}
