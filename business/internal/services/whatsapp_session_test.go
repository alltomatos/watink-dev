package services

import (
	"encoding/json"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
)

func TestBuildDeleteSessionCommandPublishesDeletionIntent(t *testing.T) {
	assertSessionCommand(t, "session.delete")
}

func TestBuildSessionCommandPublishesStopIntent(t *testing.T) {
	assertSessionCommand(t, "session.stop")
}

func assertSessionCommand(t *testing.T, commandType string) {
	t.Helper()
	tenantID := uuid.New()
	whatsapp := models.Whatsapp{ID: 42, TenantID: tenantID}

	routingKey, command := buildSessionCommand(whatsapp, commandType)

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
