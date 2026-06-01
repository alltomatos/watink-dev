package services

import (
	"encoding/json"
	"log"

	"github.com/alltomatos/watinkdev/business/internal/database"
	"github.com/alltomatos/watinkdev/business/internal/models"
)

func CreateTicketLog(ticketID int, tenantID string, userID *int, logType string, payload map[string]interface{}) {
	payloadStr := ""
	if payload != nil {
		b, _ := json.Marshal(payload)
		payloadStr = string(b)
	}

	var ticket models.Ticket
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", ticketID, tenantID).First(&ticket).Error; err != nil {
		log.Printf("[TicketLog] Error finding ticket %d: %v", ticketID, err)
		return
	}

	ticketLog := models.TicketLog{
		TicketID: ticketID,
		UserID:   userID,
		Type:     logType,
		Payload:  payloadStr,
		TenantID: ticket.TenantID,
	}

	if err := database.DB.Create(&ticketLog).Error; err != nil {
		log.Printf("[TicketLog] Error creating log for ticket %d: %v", ticketID, err)
	}
}
