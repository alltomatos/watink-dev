package usecases

import (
	"context"
	"log/slog"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DistributeTicketUseCase handles automatic ticket distribution to agents.
// This is the core business logic extracted from services/distribution_service.go.
type DistributeTicketUseCase struct {
	ticketRepo domain.TicketRepository
	queueRepo  domain.QueueRepository
	eventBus   domain.EventBus
	db         *gorm.DB // transitional: needed for complex user-queue queries not yet in repository interfaces
}

func NewDistributeTicketUseCase(
	ticketRepo domain.TicketRepository,
	queueRepo domain.QueueRepository,
	eventBus domain.EventBus,
	db *gorm.DB,
) *DistributeTicketUseCase {
	return &DistributeTicketUseCase{
		ticketRepo: ticketRepo,
		queueRepo:  queueRepo,
		eventBus:   eventBus,
		db:         db,
	}
}

// Execute distributes a ticket to the best available agent based on queue strategy.
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
		contact, err := uc.findContactWithWallet(ctx, ticket.ContactID, tenantID)
		if err == nil && contact != nil && contact.WalletUserID != nil {
			inQueue, err := uc.isUserInQueue(ctx, *contact.WalletUserID, queueID)
			if err == nil && inQueue {
				return uc.assignTicket(ctx, ticket, *contact.WalletUserID, tenantID, "Wallet")
			}
		}
	}

	// 2. Strategy dispatch
	if strategy == "" || strategy == "MANUAL" {
		slog.Info("distribution skipped",
			"reason", "manual strategy",
			"ticket_id", ticketID,
		)
		return nil
	}

	users, err := uc.findQueueUsers(ctx, queueID, tenantID)
	if err != nil {
		return err
	}
	if len(users) == 0 {
		slog.Info("no users for queue",
			"queue_id", queueID,
			"action", "keeping ticket unassigned",
		)
		return nil
	}

	var assignedUserID int
	switch strategy {
	case "AUTO_ROUND_ROBIN":
		assignedUserID = uc.roundRobin(ctx, users, queueID, tenantID)
	case "AUTO_BALANCED":
		assignedUserID = uc.balanced(ctx, users, tenantID)
	default:
		return nil
	}

	if assignedUserID != 0 {
		return uc.assignTicket(ctx, ticket, assignedUserID, tenantID, strategy)
	}
	return nil
}

func (uc *DistributeTicketUseCase) assignTicket(ctx context.Context, ticket *domain.Ticket, userID int, tenantID uuid.UUID, strategy string) error {
	fields := map[string]interface{}{
		"userId": userID,
		"status": "open",
	}
	if err := uc.ticketRepo.Update(ctx, ticket, fields); err != nil {
		return err
	}
	slog.Info("ticket assigned",
		"ticket_id", ticket.ID,
		"user_id", userID,
		"strategy", strategy,
	)

	// Emit domain event
	_ = uc.eventBus.Publish(ctx, domain.NewTicketAssignedEvent(ticket.ID, userID, tenantID))
	return nil
}

// --- Transitional queries (still using gorm.DB directly) ---
// These will be moved to repository interfaces once UserRepository is fully implemented.

func (uc *DistributeTicketUseCase) findContactWithWallet(ctx context.Context, contactID int, tenantID uuid.UUID) (*models.Contact, error) {
	var contact models.Contact
	err := uc.db.WithContext(ctx).Where("id = ? AND \"tenantId\" = ?", contactID, tenantID).First(&contact).Error
	if err != nil {
		return nil, err
	}
	return &contact, nil
}

func (uc *DistributeTicketUseCase) isUserInQueue(ctx context.Context, userID int, queueID int) (bool, error) {
	var count int64
	uc.db.WithContext(ctx).Table("user_queues").Where("\"userId\" = ? AND \"queueId\" = ?", userID, queueID).Count(&count)
	return count > 0, nil
}

func (uc *DistributeTicketUseCase) findQueueUsers(ctx context.Context, queueID int, tenantID uuid.UUID) ([]models.User, error) {
	var users []models.User
	err := uc.db.WithContext(ctx).
		Joins("JOIN user_queues uq ON uq.\"userId\" = \"Users\".id").
		Where("uq.\"queueId\" = ? AND \"Users\".\"tenantId\" = ?", queueID, tenantID).
		Find(&users).Error
	return users, err
}

func (uc *DistributeTicketUseCase) roundRobin(ctx context.Context, users []models.User, queueID int, tenantID uuid.UUID) int {
	var lastTicket models.Ticket
	err := uc.db.WithContext(ctx).
		Where("\"queueId\" = ? AND \"tenantId\" = ? AND \"userId\" IS NOT NULL", queueID, tenantID).
		Order("id desc").
		First(&lastTicket).Error

	if err != nil {
		return users[0].ID
	}

	lastIdx := -1
	for i, u := range users {
		if lastTicket.UserID != nil && u.ID == *lastTicket.UserID {
			lastIdx = i
			break
		}
	}

	nextIdx := (lastIdx + 1) % len(users)
	return users[nextIdx].ID
}

func (uc *DistributeTicketUseCase) balanced(ctx context.Context, users []models.User, tenantID uuid.UUID) int {
	var userIDs []int
	for _, u := range users {
		userIDs = append(userIDs, u.ID)
	}

	// Fetch open tickets for the candidate users and count in Go to avoid
	// SQL dialect differences (PostgreSQL requires double-quoted identifiers;
	// SQLite treats them as string literals).
	var tickets []models.Ticket
	uc.db.WithContext(ctx).
		Model(&models.Ticket{}).
		Select("userId").
		Where("userId IN ? AND status = 'open' AND tenantId = ?", userIDs, tenantID).
		Find(&tickets)

	counts := make(map[int]int64)
	for _, t := range tickets {
		if t.UserID != nil {
			counts[*t.UserID]++
		}
	}

	minCount := int64(999999)
	bestUserID := users[0].ID
	for _, u := range users {
		if c := counts[u.ID]; c < minCount {
			minCount = c
			bestUserID = u.ID
		}
	}

	return bestUserID
}
