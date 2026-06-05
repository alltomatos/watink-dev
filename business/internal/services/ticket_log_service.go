package services

import (
	"encoding/json"
	"log"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TicketLogService struct {
	db *gorm.DB
}

func NewTicketLogService(db *gorm.DB) *TicketLogService {
	return &TicketLogService{db: db}
}

func (s *TicketLogService) CreateTicketLog(ticketID int, tenantID uuid.UUID, userID *int, logType string, payload map[string]interface{}) {
	payloadStr := ""
	if payload != nil {
		b, _ := json.Marshal(payload)
		payloadStr = string(b)
	}

	var ticket models.Ticket
	if err := s.db.Where("id = ? AND \"tenantId\" = ?", ticketID, tenantID).First(&ticket).Error; err != nil {
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

	if err := s.db.Create(&ticketLog).Error; err != nil {
		log.Printf("[TicketLog] Error creating log for ticket %d: %v", ticketID, err)
	}
}