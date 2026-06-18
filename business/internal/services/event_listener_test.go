package services

import (
	"encoding/json"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func setupEventListenerDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
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

func TestGetSessionID(t *testing.T) {
	cases := []struct {
		input string
		want  int
	}{
		{"42", 42},
		{"0", 0},
		{"abc", 0},
		{"", 0},
	}
	for _, tc := range cases {
		got := getSessionID(tc.input)
		if got != tc.want {
			t.Errorf("getSessionID(%q) = %d, want %d", tc.input, got, tc.want)
		}
	}
}

func TestHandleQrCode_UpdatesWhatsapp(t *testing.T) {
	db := setupEventListenerDB(t)
	tenantID := uuid.New()
	seedWhatsapp(t, db, 1, tenantID)

	payload, _ := json.Marshal(map[string]string{"sessionId": "1", "qrCode": "data:image/png;base64,abc=="})
	if err := handleQrCode(db, payload, tenantID); err != nil {
		t.Fatalf("handleQrCode() error: %v", err)
	}

	var wa models.Whatsapp
	db.First(&wa, 1)
	if wa.Status != "QRCODE" {
		t.Errorf("expected status QRCODE, got %s", wa.Status)
	}
}

func TestHandleQrCode_InvalidJSON(t *testing.T) {
	db := setupEventListenerDB(t)
	err := handleQrCode(db, json.RawMessage(`{bad json`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

func TestHandleSessionStatus_UpdatesStatus(t *testing.T) {
	db := setupEventListenerDB(t)
	tenantID := uuid.New()
	seedWhatsapp(t, db, 2, tenantID)

	payload, _ := json.Marshal(map[string]string{"sessionId": "2", "status": "DISCONNECTED", "number": "+5511999999999"})
	if err := handleSessionStatus(db, payload, tenantID); err != nil {
		t.Fatalf("handleSessionStatus() error: %v", err)
	}

	var wa models.Whatsapp
	db.First(&wa, 2)
	if wa.Status != "DISCONNECTED" {
		t.Errorf("expected status DISCONNECTED, got %s", wa.Status)
	}
}

func TestHandleSessionStatus_InvalidJSON(t *testing.T) {
	db := setupEventListenerDB(t)
	err := handleSessionStatus(db, json.RawMessage(`{bad`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

func TestHandleSessionStatus_NoRowsAffected(t *testing.T) {
	db := setupEventListenerDB(t)
	// session does not exist — should return nil (no-op)
	payload, _ := json.Marshal(map[string]string{"sessionId": "999", "status": "CONNECTED"})
	if err := handleSessionStatus(db, payload, uuid.New()); err != nil {
		t.Fatalf("handleSessionStatus() with missing row returned error: %v", err)
	}
}

func TestHandlePairingCode_UpdatesStatus(t *testing.T) {
	db := setupEventListenerDB(t)
	tenantID := uuid.New()
	seedWhatsapp(t, db, 3, tenantID)

	payload, _ := json.Marshal(map[string]string{"sessionId": "3", "status": "PAIRING", "pairingCode": "ABC-123"})
	if err := handlePairingCode(db, payload, tenantID); err != nil {
		t.Fatalf("handlePairingCode() error: %v", err)
	}

	var wa models.Whatsapp
	db.First(&wa, 3)
	if wa.Status != "PAIRING" {
		t.Errorf("expected status PAIRING, got %s", wa.Status)
	}
}

func TestHandlePairingCode_DefaultStatus(t *testing.T) {
	db := setupEventListenerDB(t)
	tenantID := uuid.New()
	seedWhatsapp(t, db, 4, tenantID)

	// No status field — should default to "QRCODE"
	payload, _ := json.Marshal(map[string]string{"sessionId": "4", "pairingCode": "XYZ-789"})
	if err := handlePairingCode(db, payload, tenantID); err != nil {
		t.Fatalf("handlePairingCode() error: %v", err)
	}

	var wa models.Whatsapp
	db.First(&wa, 4)
	if wa.Status != "QRCODE" {
		t.Errorf("expected default status QRCODE, got %s", wa.Status)
	}
}

func TestHandleMessageAck_InvalidJSON(t *testing.T) {
	db := setupEventListenerDB(t)
	err := handleMessageAck(db, json.RawMessage(`{bad`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

func TestHandleMessageRevoke_InvalidJSON(t *testing.T) {
	db := setupEventListenerDB(t)
	err := handleMessageRevoke(db, json.RawMessage(`{bad`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

func TestHandleMessageReaction_InvalidJSON(t *testing.T) {
	db := setupEventListenerDB(t)
	err := handleMessageReaction(db, json.RawMessage(`{bad`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}

func TestHandleContactUpdate_InvalidJSON(t *testing.T) {
	db := setupEventListenerDB(t)
	err := handleContactUpdate(db, json.RawMessage(`{bad`), uuid.New())
	if err == nil {
		t.Error("expected error for invalid JSON, got nil")
	}
}
