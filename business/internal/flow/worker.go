package flow

import (
	"log"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FlowWorker processa eventos de fluxo automatizado.
// DB injetado via construtor — zero acesso a database.DB global.
type FlowWorker struct {
	db *gorm.DB
}

type FlowEventPayload struct {
	TicketID    int    `json:"ticketId"`
	ContactID   int    `json:"contactId"`
	MessageBody string `json:"messageBody"`
	FromMe      bool   `json:"fromMe"`
	IsGroup     bool   `json:"isGroup"`
}

func NewFlowWorker(db *gorm.DB) *FlowWorker {
	return &FlowWorker{db: db}
}

func (fw *FlowWorker) ProcessEvent(envelope map[string]interface{}) {
	// Generic envelope processing logic
	// In the future, this will be called by the RabbitMQ consumer
	log.Println("FlowWorker processing event...")
}

func (fw *FlowWorker) HandleWhatsAppMessage(data FlowEventPayload, tenantID uuid.UUID) {
	if data.FromMe {
		return
	}

	log.Printf("[FlowWorker] Evaluating triggers for: %s (Tenant: %s)", data.MessageBody, tenantID)

	// 1. Check for Active Flow Session (Simplified logic for now)
	// We would query FlowSessions table here

	// 2. Check for Triggers (only active flows)
	var trigger models.Flow
	res := fw.db.Where("tenantId = ? AND triggerType = ? AND triggerValue = ? AND active = ?",
		tenantID, "whatsapp_message", data.MessageBody, true).First(&trigger)

	if res.Error == nil {
		log.Printf("[FlowWorker] Trigger matched! Starting Flow %d", trigger.ID)
		// fw.StartFlow(trigger.ID, data)
	}
}
