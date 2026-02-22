package flow

import (
	"log"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/google/uuid"
)

type FlowWorker struct {
	// dependencies like RabbitMQ would go here
}

type FlowEventPayload struct {
	TicketID    int    `json:"ticketId"`
	ContactID   int    `json:"contactId"`
	MessageBody string `json:"messageBody"`
	FromMe      bool   `json:"fromMe"`
	IsGroup     bool   `json:"isGroup"`
}

func NewFlowWorker() *FlowWorker {
	return &FlowWorker{}
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
	
	// 2. Check for Triggers
	var trigger models.Flow // Placeholder: assuming we have a Flow model with trigger logic
	res := database.DB.Where("tenantId = ? AND triggerType = ? AND triggerValue = ?", 
		tenantID, "whatsapp_message", data.MessageBody).First(&trigger)
	
	if res.Error == nil {
		log.Printf("[FlowWorker] Trigger matched! Starting Flow %d", trigger.ID)
		// fw.StartFlow(trigger.ID, data)
	}
}
