package usecases

import (
	"context"
	"log/slog"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
)

// DistributeTicketUseCase handles automatic ticket distribution to agents.
type DistributeTicketUseCase struct {
	ticketRepo    domain.TicketRepository
	queueRepo     domain.QueueRepository
	eventBus      domain.EventBus
	contactRepo   domain.ContactRepository
	userQueueRepo domain.UserQueueRepository
}

func NewDistributeTicketUseCase(
	ticketRepo domain.TicketRepository,
	queueRepo domain.QueueRepository,
	eventBus domain.EventBus,
	contactRepo domain.ContactRepository,
	userQueueRepo domain.UserQueueRepository,
) *DistributeTicketUseCase {
	return &DistributeTicketUseCase{
		ticketRepo:    ticketRepo,
		queueRepo:     queueRepo,
		eventBus:      eventBus,
		contactRepo:   contactRepo,
		userQueueRepo: userQueueRepo,
	}
}

func (uc *DistributeTicketUseCase) Execute(ctx context.Context, ticketID int, queueID int, tenantID uuid.UUID) error {
	queue, err := uc.queueRepo.FindByID(ctx, queueID, tenantID)
	if err != nil {
		return err
	}
	if queue == nil {
		return nil
	}

	ticket, err := uc.ticketRepo.FindByID(ctx, ticketID, tenantID)
	if err != nil {
		return err
	}
	if ticket == nil {
		return nil
	}

	strategy := queue.DistributionStrategy

	// 1. Wallet Priority
	if queue.PrioritizeWallet {
		contact, err := uc.contactRepo.FindByID(ctx, ticket.ContactID, tenantID)
		if err == nil && contact != nil && contact.WalletUserID != nil {
			inQueue, err := uc.userQueueRepo.IsUserInQueue(ctx, *contact.WalletUserID, queueID)
			if err == nil && inQueue {
				return uc.assignTicket(ctx, ticket, *contact.WalletUserID, tenantID, "Wallet")
			}
		}
	}

	// 2. Strategy dispatch
	if strategy == "" || strategy == "MANUAL" {
		slog.Info("distribution skipped", "reason", "manual strategy", "ticket_id", ticketID)
		return nil
	}

	users, err := uc.userQueueRepo.FindQueueUsers(ctx, queueID, tenantID)
	if err != nil {
		return err
	}
	if len(users) == 0 {
		slog.Info("no users for queue", "queue_id", queueID, "action", "keeping ticket unassigned")
		return nil
	}

	var assignedUserID int
	switch strategy {
	case "AUTO_ROUND_ROBIN":
		assignedUserID, err = uc.roundRobin(ctx, users, queueID, tenantID)
		if err != nil {
			return err
		}
	case "AUTO_BALANCED":
		assignedUserID, err = uc.balanced(ctx, users, tenantID)
		if err != nil {
			return err
		}
	default:
		return nil
	}

	if assignedUserID != 0 {
		return uc.assignTicket(ctx, ticket, assignedUserID, tenantID, strategy)
	}
	return nil
}

func (uc *DistributeTicketUseCase) assignTicket(ctx context.Context, ticket *domain.Ticket, userID int, tenantID uuid.UUID, strategy string) error {
	fields := map[string]interface{}{"userId": userID, "status": "open"}
	if err := uc.ticketRepo.Update(ctx, ticket, fields); err != nil {
		return err
	}
	slog.Info("ticket assigned", "ticket_id", ticket.ID, "user_id", userID, "strategy", strategy)
	_ = uc.eventBus.Publish(ctx, domain.NewTicketAssignedEvent(ticket.ID, userID, tenantID))
	return nil
}

func (uc *DistributeTicketUseCase) roundRobin(ctx context.Context, users []domain.User, queueID int, tenantID uuid.UUID) (int, error) {
	lastUserID, err := uc.ticketRepo.FindLastAssignedInQueue(ctx, queueID, tenantID)
	if err != nil || lastUserID == 0 {
		return users[0].ID, nil
	}

	lastIdx := -1
	for i, u := range users {
		if u.ID == lastUserID {
			lastIdx = i
			break
		}
	}
	return users[(lastIdx+1)%len(users)].ID, nil
}

func (uc *DistributeTicketUseCase) balanced(ctx context.Context, users []domain.User, tenantID uuid.UUID) (int, error) {
	userIDs := make([]int, len(users))
	for i, u := range users {
		userIDs[i] = u.ID
	}

	counts, err := uc.ticketRepo.CountOpenTicketsPerUser(ctx, userIDs, tenantID)
	if err != nil {
		return users[0].ID, nil
	}

	minCount := int64(999999)
	bestUserID := users[0].ID
	for _, u := range users {
		if c := counts[u.ID]; c < minCount {
			minCount = c
			bestUserID = u.ID
		}
	}
	return bestUserID, nil
}
