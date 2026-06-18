package usecases

import (
	"context"
	"encoding/json"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
)

type LogTicketActionInput struct {
	TicketID int
	TenantID uuid.UUID
	UserID   *int
	LogType  string
	Payload  map[string]interface{}
}

type LogTicketActionUseCase struct {
	ticketRepo    domain.TicketRepository
	ticketLogRepo domain.TicketLogRepository
}

func NewLogTicketActionUseCase(ticketRepo domain.TicketRepository, ticketLogRepo domain.TicketLogRepository) *LogTicketActionUseCase {
	return &LogTicketActionUseCase{ticketRepo: ticketRepo, ticketLogRepo: ticketLogRepo}
}

func (uc *LogTicketActionUseCase) Execute(ctx context.Context, input LogTicketActionInput) error {
	payloadStr := ""
	if input.Payload != nil {
		b, _ := json.Marshal(input.Payload)
		payloadStr = string(b)
	}

	ticket, err := uc.ticketRepo.FindByID(ctx, input.TicketID, input.TenantID)
	if err != nil {
		return err
	}
	if ticket == nil {
		return domain.ErrTicketNotFound
	}

	ticketLog := &models.TicketLog{
		TicketID:  input.TicketID,
		UserID:    input.UserID,
		Type:      input.LogType,
		Payload:   payloadStr,
		TenantID:  ticket.TenantID,
		CreatedAt: time.Now(),
	}

	return uc.ticketLogRepo.Create(ctx, ticketLog)
}
