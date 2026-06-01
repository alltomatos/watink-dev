package application

import (
	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/database"
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/infrastructure/repository"
	"gorm.io/gorm"
)

// Container holds all wired dependencies for the application layer.
// Constructed once at startup and passed to controllers/adapters.
type Container struct {
	// Repositories
	TicketRepo         domain.TicketRepository
	MessageRepo        domain.MessageRepository
	ContactRepo        domain.ContactRepository
	QueueRepo          domain.QueueRepository
	UserRepo           domain.UserRepository
	ChannelSessionRepo domain.ChannelSessionRepository

	// Event Bus
	EventBus domain.EventBus

	// Use Cases
	ReceiveMessage   *usecases.ReceiveMessageUseCase
	DistributeTicket *usecases.DistributeTicketUseCase
	UpdateTicket     *usecases.UpdateTicketUseCase
	LogTicketAction  *usecases.LogTicketActionUseCase
}

// NewContainer wires all dependencies manually.
// db parameter allows passing a transaction-scoped DB when needed.
func NewContainer(db *gorm.DB) *Container {
	if db == nil {
		db = database.DB
	}

	// --- Repositories ---
	ticketRepo := repository.NewGORMTicketRepo(db)
	messageRepo := repository.NewGORMMessageRepo(db)
	contactRepo := repository.NewGORMContactRepo(db)
	queueRepo := repository.NewGORMQueueRepo(db)
	userRepo := repository.NewGORMUserRepo(db)
	sessionRepo := repository.NewGORMChannelSessionRepo(db)

	// --- Event Bus ---
	eventBus := NewInMemoryEventBus()

	// --- Use Cases ---
	logTicketAction := usecases.NewLogTicketActionUseCase(db)

	distributeTicket := usecases.NewDistributeTicketUseCase(
		ticketRepo,
		queueRepo,
		eventBus,
		db,
	)

	updateTicket := usecases.NewUpdateTicketUseCase(
		ticketRepo,
		eventBus,
		distributeTicket,
		logTicketAction,
	)

	receiveMessage := usecases.NewReceiveMessageUseCase(
		eventBus,
		messageRepo,
		contactRepo,
		ticketRepo,
	)

	return &Container{
		TicketRepo:         ticketRepo,
		MessageRepo:        messageRepo,
		ContactRepo:        contactRepo,
		QueueRepo:          queueRepo,
		UserRepo:           userRepo,
		ChannelSessionRepo: sessionRepo,
		EventBus:           eventBus,
		ReceiveMessage:     receiveMessage,
		DistributeTicket:   distributeTicket,
		UpdateTicket:       updateTicket,
		LogTicketAction:    logTicketAction,
	}
}
