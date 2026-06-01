package usecases

import (
	"context"
	"encoding/json"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LogTicketActionInput carries the data for ticket log creation.
type LogTicketActionInput struct {
	TicketID int
	TenantID uuid.UUID
	UserID   *int
	LogType  string
	Payload  map[string]interface{}
}

// LogTicketActionUseCase handles ticket audit logging.
// Extracted from services/ticket_log_service.go.
type LogTicketActionUseCase struct {
	db *gorm.DB // transitional: needed for complex queries not yet in domain
}

func NewLogTicketActionUseCase(db *gorm.DB) *LogTicketActionUseCase {
	return &LogTicketActionUseCase{db: db}
}

// Execute creates an audit log entry for a ticket action.
func (uc *LogTicketActionUseCase) Execute(ctx context.Context, input LogTicketActionInput) error {
	payloadStr := ""
	if input.Payload != nil {
		b, _ := json.Marshal(input.Payload)
		payloadStr = string(b)
	}

	var ticket domain.Ticket
	err := uc.db.WithContext(ctx).
		Where("id = ? AND \"tenantId\" = ?", input.TicketID, input.TenantID).
		First(&ticket).Error
	if err != nil {
		return err
	}

	ticketLog := models.TicketLog{
		TicketID:  input.TicketID,
		UserID:    input.UserID,
		Type:      input.LogType,
		Payload:   payloadStr,
		TenantID:  ticket.TenantID,
		CreatedAt: time.Now(),
	}

	return uc.db.WithContext(ctx).Create(&ticketLog).Error
}
