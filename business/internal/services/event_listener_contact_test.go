package services

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
)

// TestSyncConnectionProfilePic_UpdatesMatchingConnection prova o invariante:
// o mesmo evento "contact.update" disparado pelo engine para QUALQUER mudança
// de foto (inclusive a da própria conta) atualiza Whatsapps.profilePicUrl
// quando o número do evento bate com o número de uma conexão — não só
// Contacts.profilePicUrl. Sem isso, a foto de uma conexão só era capturada
// uma vez (no primeiro login) e nunca mais — reproduzido em produção: a
// primeira tentativa (logo após reconectar) deu 404 do WhatsApp, e o evento
// de atualização que chegou depois nunca alcançava a conexão.
func TestSyncConnectionProfilePic_UpdatesMatchingConnection(t *testing.T) {
	db, sessions, _ := setupEventListenerRepos(t)
	tenantID := uuid.New()
	wa := models.Whatsapp{ID: 3, Name: "zap-4863", Number: "558597964683", TenantID: tenantID}
	if err := db.Create(&wa).Error; err != nil {
		t.Fatalf("seed whatsapp: %v", err)
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"sessionId": "3",
		"contact": map[string]interface{}{
			"jid":           "558597964683@s.whatsapp.net",
			"profilePicUrl": "https://pps.whatsapp.net/v/photo.jpg",
		},
	})
	if err := syncConnectionProfilePic(context.Background(), sessions, nil, payload, tenantID); err != nil {
		t.Fatalf("syncConnectionProfilePic: %v", err)
	}

	var reloaded models.Whatsapp
	if err := db.First(&reloaded, 3).Error; err != nil {
		t.Fatalf("reload: %v", err)
	}
	if reloaded.ProfilePicUrl != "https://pps.whatsapp.net/v/photo.jpg" {
		t.Fatalf("profilePicUrl não foi atualizado, got %q", reloaded.ProfilePicUrl)
	}
}

// Número do evento não bate com nenhuma conexão (é um contato comum) → no-op,
// sem erro. handleContactUpdate (não testado aqui) é quem trata esse caso.
func TestSyncConnectionProfilePic_NoMatchingConnection_NoOp(t *testing.T) {
	db, sessions, _ := setupEventListenerRepos(t)
	tenantID := uuid.New()
	wa := models.Whatsapp{ID: 1, Name: "zap-0991", Number: "558598490991", TenantID: tenantID}
	if err := db.Create(&wa).Error; err != nil {
		t.Fatalf("seed whatsapp: %v", err)
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"contact": map[string]interface{}{
			"jid":           "5511988887777@s.whatsapp.net", // número de um CONTATO, não de uma conexão
			"profilePicUrl": "https://pps.whatsapp.net/v/contact.jpg",
		},
	})
	if err := syncConnectionProfilePic(context.Background(), sessions, nil, payload, tenantID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var reloaded models.Whatsapp
	db.First(&reloaded, 1)
	if reloaded.ProfilePicUrl != "" {
		t.Fatalf("conexão não-relacionada não deveria ter sido tocada, got %q", reloaded.ProfilePicUrl)
	}
}

// Payload sem profilePicUrl (ex.: evento de remoção de foto futuro) → no-op.
func TestSyncConnectionProfilePic_EmptyProfilePic_NoOp(t *testing.T) {
	_, sessions, _ := setupEventListenerRepos(t)
	payload, _ := json.Marshal(map[string]interface{}{
		"contact": map[string]interface{}{"jid": "558597964683@s.whatsapp.net", "profilePicUrl": ""},
	})
	if err := syncConnectionProfilePic(context.Background(), sessions, nil, payload, uuid.New()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
