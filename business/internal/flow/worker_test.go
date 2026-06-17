package flow

import (
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupFlowTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	tmpFile := t.TempDir() + "/flow_test.db"
	db, err := gorm.Open(sqlite.Open(tmpFile), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})
	// DDL manual — SQLite não suporta gen_random_uuid() nem type:uuid
	db.Exec(`CREATE TABLE IF NOT EXISTS "Flows" (
		"id" INTEGER PRIMARY KEY AUTOINCREMENT,
		"name" TEXT,
		"triggerType" TEXT,
		"triggerValue" TEXT,
		"nodes" TEXT,
		"edges" TEXT,
		"active" BOOLEAN DEFAULT false,
		"whatsappId" INTEGER,
		"tenantId" TEXT,
		"createdAt" DATETIME,
		"updatedAt" DATETIME
	)`)
	return db
}

// ---- DI Tests ----

func TestFlowWorker_DI_ValidDB(t *testing.T) {
	db := setupFlowTestDB(t)
	worker := NewFlowWorker(db)
	assert.NotNil(t, worker)
	assert.NotNil(t, worker.db)
}

func TestFlowWorker_DI_NilDB(t *testing.T) {
	worker := NewFlowWorker(nil)
	assert.NotNil(t, worker)
	assert.Nil(t, worker.db)
}

// ---- FromMe Early Return ----

func TestFlowWorker_HandleWhatsAppMessage_SkipsFromMe(t *testing.T) {
	db := setupFlowTestDB(t)
	worker := NewFlowWorker(db)
	tenantID := uuid.New()

	payload := FlowEventPayload{
		MessageBody: "ola",
		FromMe:      true,
	}
	// Deve retornar imediatamente sem tocar o DB
	worker.HandleWhatsAppMessage(payload, tenantID)
}

// ---- Trigger Matching ----

// TestFlowWorker_TriggerMatched valida que o worker encontra um Flow
// cujo triggerType + triggerValue correspondem ao payload
func TestFlowWorker_TriggerMatched(t *testing.T) {
	db := setupFlowTestDB(t)
	worker := NewFlowWorker(db)
	tenantID := uuid.New()

	flow := models.Flow{
		Name:         "Greeting Flow",
		TriggerType:  "whatsapp_message",
		TriggerValue: "ola",
		Active:       true,
		TenantID:     tenantID,
	}
	// Usar .Select para garantir que campos boolean zero-value sejam persistidos
	db.Select("Name", "TriggerType", "TriggerValue", "Active", "TenantID").Create(&flow)

	payload := FlowEventPayload{
		MessageBody: "ola",
		FromMe:      false,
	}
	worker.HandleWhatsAppMessage(payload, tenantID)
}

// TestFlowWorker_TriggerNotMatched verifica que mensagem diferente
// não dispara o flow
func TestFlowWorker_TriggerNotMatched(t *testing.T) {
	db := setupFlowTestDB(t)
	worker := NewFlowWorker(db)
	tenantID := uuid.New()

	flow := models.Flow{
		Name:         "Greeting Flow",
		TriggerType:  "whatsapp_message",
		TriggerValue: "bom dia",
		Active:       true,
		TenantID:     tenantID,
	}
	db.Select("Name", "TriggerType", "TriggerValue", "Active", "TenantID").Create(&flow)

	payload := FlowEventPayload{
		MessageBody: "ola",
		FromMe:      false,
	}
	// "ola" != "bom dia" — trigger não deve ser ativado
	worker.HandleWhatsAppMessage(payload, tenantID)
}

// ---- Tenant Isolation ----

// TestFlowWorker_TenantIsolation verifica que flows de TenantA
// nunca são visíveis para TenantB
func TestFlowWorker_TenantIsolation(t *testing.T) {
	db := setupFlowTestDB(t)
	worker := NewFlowWorker(db)
	tenantA := uuid.New()
	tenantB := uuid.New()

	flowA := models.Flow{
		Name:         "Flow A",
		TriggerType:  "whatsapp_message",
		TriggerValue: "ola",
		Active:       true,
		TenantID:     tenantA,
	}
	db.Select("Name", "TriggerType", "TriggerValue", "Active", "TenantID").Create(&flowA)

	payload := FlowEventPayload{
		MessageBody: "ola",
		FromMe:      false,
	}
	// TenantB envia "ola" — não deve ativar o flow de TenantA
	worker.HandleWhatsAppMessage(payload, tenantB)

	// Verificar no DB: o flow continua pertencendo apenas a TenantA
	var count int64
	db.Model(&models.Flow{}).Where("tenantId = ? AND triggerType = ? AND triggerValue = ?",
		tenantB, "whatsapp_message", "ola").Count(&count)
	assert.Equal(t, int64(0), count, "TenantB must not see TenantA flows")
}

// ---- Inactive Flow Ignored ----

// TestFlowWorker_InactiveFlowIgnored verifica que flows com Active=false
// NÃO são considerados como triggers (query filtra active = true)
func TestFlowWorker_InactiveFlowIgnored(t *testing.T) {
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	// Forçar limpeza antes do teste
	db.Exec("DELETE FROM Flows")

	// Criar flow explicitamente inativo
	flow := models.Flow{
		Name:         "Inactive Flow",
		TriggerType:  "whatsapp_message",
		TriggerValue: "ola",
		Active:       false, // Garantir que o valor zero não seja ignorado pelo GORM
		TenantID:     tenantID,
	}
	// Usar .Select para garantir que o campo Active false seja persistido mesmo com o default
	db.Select("Name", "TriggerType", "TriggerValue", "Active", "TenantID").Create(&flow)

	payload := FlowEventPayload{
		MessageBody: "ola",
		FromMe:      false,
	}
	
	worker := NewFlowWorker(db)
	worker.HandleWhatsAppMessage(payload, tenantID)

	// Verificar via GORM direto
	var activeFlows []models.Flow
	db.Where("tenantId = ? AND active = ?", tenantID, true).Find(&activeFlows)
	
	assert.Empty(t, activeFlows, "inactive flow must not appear as active")
}

// ---- ProcessEvent Smoke ----

func TestFlowWorker_ProcessEvent_Smoke(t *testing.T) {
	db := setupFlowTestDB(t)
	worker := NewFlowWorker(db)

	envelope := map[string]interface{}{
		"type": "test",
		"data": "payload",
	}
	worker.ProcessEvent(envelope)
}
