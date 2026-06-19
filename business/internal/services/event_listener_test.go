package services

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/infrastructure/repository"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// --- Test helpers ---

func setupEventListenerRepos(t *testing.T) (*gorm.DB, domain.ChannelSessionRepository, domain.MessageRepository) {
	t.Helper()
	db := testutil.NewTestDB(t)
	return db, repository.NewGORMChannelSessionRepo(db), repository.NewGORMMessageRepo(db)
}

func seedWhatsapp(t *testing.T, db *gorm.DB, id int, tenantID uuid.UUID) {
	t.Helper()
	wa := models.Whatsapp{
		ID:       id,
		Name:     "test-session-" + string(rune('0'+id)),
		Status:   "CONNECTED",
		TenantID: tenantID,
	}
	if err := db.Create(&wa).Error; err != nil {
		t.Fatalf("seedWhatsapp: %v", err)
	}
}

// --- getSessionID (pure, offline) ---

func TestGetSessionID(t *testing.T) {
	cases := []struct {
		input string
		want  int
	}{
		{"42", 42},
		{"0", 0},
		{"abc", 0},
		{"", 0},
		{"uuid-tenant-99", 99},
	}
	for _, tc := range cases {
		got := getSessionID(tc.input)
		if got != tc.want {
			t.Errorf("getSessionID(%q) = %d, want %d", tc.input, got, tc.want)
		}
	}
}

// --- handleQrCode ---

func TestHandleQrCode_UpdatesWhatsapp(t *testing.T) {
	db, sessions, _ := setupEventListenerRepos(t)
	tenantID := uuid.New()
	seedWhatsapp(t, db, 1, tenantID)

	payload, _ := json.Marshal(map[string]string{"sessionId": "1", "qrCode": "data:image/png;base64,abc=="})
	if err := handleQrCode(context.Background(), sessions, payload, tenantID); err != nil {
		t.Fatalf("handleQrCode() error: %v", err)
	}

	var wa models.Whatsapp
	db.First(&wa, 1)
	if wa.Status != "QRCODE" {
		t.Errorf("expected status QRCODE, got %s", wa.Status)
	}
}

func TestHandleQrCode_InvalidJSON(t *testing.T) {
	err := handleQrCode(context.Background(), nil, json.RawMessage(`{bad json`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

// --- handleSessionStatus ---

func TestHandleSessionStatus_UpdatesStatus(t *testing.T) {
	db, sessions, _ := setupEventListenerRepos(t)
	tenantID := uuid.New()
	seedWhatsapp(t, db, 2, tenantID)

	payload, _ := json.Marshal(map[string]string{"sessionId": "2", "status": "DISCONNECTED", "number": "+5511999999999"})
	if err := handleSessionStatus(context.Background(), sessions, payload, tenantID); err != nil {
		t.Fatalf("handleSessionStatus() error: %v", err)
	}

	var wa models.Whatsapp
	db.First(&wa, 2)
	if wa.Status != "DISCONNECTED" {
		t.Errorf("expected status DISCONNECTED, got %s", wa.Status)
	}
}

func TestHandleSessionStatus_InvalidJSON(t *testing.T) {
	err := handleSessionStatus(context.Background(), nil, json.RawMessage(`{bad`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

func TestHandleSessionStatus_NoRowsAffected(t *testing.T) {
	_, sessions, _ := setupEventListenerRepos(t)
	// session does not exist — should return nil (no-op)
	payload, _ := json.Marshal(map[string]string{"sessionId": "999", "status": "CONNECTED"})
	if err := handleSessionStatus(context.Background(), sessions, payload, uuid.New()); err != nil {
		t.Fatalf("handleSessionStatus() with missing row returned error: %v", err)
	}
}

// --- handlePairingCode ---

func TestHandlePairingCode_UpdatesStatus(t *testing.T) {
	db, sessions, _ := setupEventListenerRepos(t)
	tenantID := uuid.New()
	seedWhatsapp(t, db, 3, tenantID)

	payload, _ := json.Marshal(map[string]string{"sessionId": "3", "status": "PAIRING", "pairingCode": "ABC-123"})
	if err := handlePairingCode(context.Background(), sessions, payload, tenantID); err != nil {
		t.Fatalf("handlePairingCode() error: %v", err)
	}

	var wa models.Whatsapp
	db.First(&wa, 3)
	if wa.Status != "PAIRING" {
		t.Errorf("expected status PAIRING, got %s", wa.Status)
	}
}

func TestHandlePairingCode_DefaultStatus(t *testing.T) {
	db, sessions, _ := setupEventListenerRepos(t)
	tenantID := uuid.New()
	seedWhatsapp(t, db, 4, tenantID)

	// No status field — should default to "QRCODE"
	payload, _ := json.Marshal(map[string]string{"sessionId": "4", "pairingCode": "XYZ-789"})
	if err := handlePairingCode(context.Background(), sessions, payload, tenantID); err != nil {
		t.Fatalf("handlePairingCode() error: %v", err)
	}

	var wa models.Whatsapp
	db.First(&wa, 4)
	if wa.Status != "QRCODE" {
		t.Errorf("expected default status QRCODE, got %s", wa.Status)
	}
}

// --- handleMessageAck / Revoke / Reaction / ContactUpdate (invalid JSON, offline) ---

func TestHandleMessageAck_InvalidJSON(t *testing.T) {
	err := handleMessageAck(context.Background(), nil, json.RawMessage(`{bad`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

func TestHandleMessageRevoke_InvalidJSON(t *testing.T) {
	err := handleMessageRevoke(context.Background(), nil, json.RawMessage(`{bad`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

func TestHandleMessageReaction_InvalidJSON(t *testing.T) {
	err := handleMessageReaction(json.RawMessage(`{bad`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

func TestHandleContactUpdate_InvalidJSON(t *testing.T) {
	err := handleContactUpdate(context.Background(), nil, json.RawMessage(`{bad`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

func TestJidToNumber(t *testing.T) {
	cases := map[string]string{
		"5511999999999@s.whatsapp.net":   "5511999999999",
		"5511999999999:12@s.whatsapp.net": "5511999999999",
		"5511999999999":                  "5511999999999",
		"":                               "",
	}
	for in, want := range cases {
		if got := jidToNumber(in); got != want {
			t.Errorf("jidToNumber(%q) = %q, want %q", in, got, want)
		}
	}
}
