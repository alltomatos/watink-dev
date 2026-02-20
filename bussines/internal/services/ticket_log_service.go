package services

import (
	"encoding/json"
	"log"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
)

func CreateTicketLog(ticketID int, userID *int, logType string, payload map[string]interface{}) {
	payloadStr := ""
	if payload != nil {
		b, _ := json.Marshal(payload)
		payloadStr = string(b)
	}

	var ticket models.Ticket
	if err := database.DB.First(&ticket, ticketID).Error; err != nil {
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
