package usecases

import (
	"context"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
)

// UpdateTicketInput carries the data for a ticket update request.
type UpdateTicketInput struct {
	TicketID int
	TenantID uuid.UUID
	Status   string
	UserID   *int
	QueueID  *int
	// Audit
	PerformedBy *int
}

// UpdateTicketUseCase handles ticket status changes, transfers, and assignments.
// Extracted from controllers/ticket.go (UpdateTicket handler).
type UpdateTicketUseCase struct {
	ticketRepo domain.TicketRepository
	eventBus   domain.EventBus
	distribute *DistributeTicketUseCase
	logAction  *LogTicketActionUseCase
}

func NewUpdateTicketUseCase(
	ticketRepo domain.TicketRepository,
	eventBus domain.EventBus,
	distribute *DistributeTicketUseCase,
	logAction *LogTicketActionUseCase,
) *UpdateTicketUseCase {
	return &UpdateTicketUseCase{
		ticketRepo: ticketRepo,
		eventBus:   eventBus,
		distribute: distribute,
		logAction:  logAction,
	}
}

// Execute applies the update and triggers side effects (distribution, logging, events).
func (uc *UpdateTicketUseCase) Execute(ctx context.Context, input UpdateTicketInput) (*domain.Ticket, error) {
	ticket, err := uc.ticketRepo.FindByID(ctx, input.TicketID, input.TenantID)
	if err != nil {
		return nil, err
	}
	if ticket == nil {
		return nil, nil
	}

	oldStatus := ticket.Status
	oldQueueID := ticket.QueueID
	oldUserID := ticket.UserID

	// Build update fields
	fields := map[string]interface{}{}
	if input.Status != "" {
		fields["status"] = input.Status
	}
	if input.UserID != nil {
		fields["userId"] = *input.UserID
	}
	if input.QueueID != nil {
		fields["queueId"] = *input.QueueID
	}

	if len(fields) == 0 {
		return ticket, nil
	}

	if err := uc.ticketRepo.Update(ctx, ticket, fields); err != nil {
		return nil, err
	}

	// Reload ticket state after update
	ticket, err = uc.ticketRepo.FindByID(ctx, input.TicketID, input.TenantID)
	if err != nil {
		return nil, err
	}

	// --- Side effects ---

	// 1. Audit logging
	if input.Status != "" && input.Status != oldStatus && uc.logAction != nil {
		_ = uc.logAction.Execute(ctx, LogTicketActionInput{
			TicketID: ticket.ID,
			TenantID: ticket.TenantID,
			UserID:   input.PerformedBy,
			LogType:  "status",
			Payload:  map[string]interface{}{"old": oldStatus, "new": input.Status},
		})
	}
	if input.QueueID != nil && (oldQueueID == nil || *oldQueueID != *input.QueueID) && uc.logAction != nil {
		_ = uc.logAction.Execute(ctx, LogTicketActionInput{
			TicketID: ticket.ID,
			TenantID: ticket.TenantID,
			UserID:   input.PerformedBy,
			LogType:  "transfer",
			Payload:  map[string]interface{}{"oldQueueId": oldQueueID, "newQueueId": input.QueueID},
		})
	}
	if input.UserID != nil && (oldUserID == nil || *oldUserID != *input.UserID) && uc.logAction != nil {
		_ = uc.logAction.Execute(ctx, LogTicketActionInput{
			TicketID: ticket.ID,
			TenantID: ticket.TenantID,
			UserID:   input.PerformedBy,
			LogType:  "assign",
			Payload:  map[string]interface{}{"oldUserId": oldUserID, "newUserId": input.UserID},
		})
	}

	// 2. Auto-distribution when queue changes
	if input.QueueID != nil && (oldQueueID == nil || *oldQueueID != *input.QueueID) && uc.distribute != nil {
		go func() {
			_ = uc.distribute.Execute(context.Background(), ticket.ID, *input.QueueID, ticket.TenantID)
		}()
	}

	// 3. Domain events
	if input.Status != "" && input.Status != oldStatus {
		_ = uc.eventBus.Publish(ctx, domain.NewTicketStatusChangedEvent(ticket.ID, oldStatus, input.Status, ticket.TenantID))
	}

	return ticket, nil
}
