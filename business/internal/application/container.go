package application

import (
	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/database"
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/infrastructure/repository"
	"github.com/alltomatos/watinkdev/business/internal/plugins"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"gorm.io/gorm"
)

type Container struct {
	DB                *gorm.DB
	TicketRepo        domain.TicketRepository
	MessageRepo       domain.MessageRepository
	ContactRepo       domain.ContactRepository
	QueueRepo         domain.QueueRepository
	UserRepo          domain.UserRepository
	ChannelSessionRepo domain.ChannelSessionRepository
	HubManager        *plugins.HubManager
	EventBus          domain.EventBus
	RedisSvc          domain.RedisService
	Broadcast         *services.RedisBroadcast
	SessionService    *services.WhatsAppSessionService
	ReceiveMessage    *usecases.ReceiveMessageUseCase
	DistributeTicket  *usecases.DistributeTicketUseCase
	UpdateTicket      *usecases.UpdateTicketUseCase
	LogTicketAction   *usecases.LogTicketActionUseCase
}

func NewContainer(db *gorm.DB, redisSvc domain.RedisService, broadcast *services.RedisBroadcast, publisher domain.CommandPublisher) *Container {
	if db == nil {
		db = database.DB
	}
	ticketRepo := repository.NewGORMTicketRepo(db)
	messageRepo := repository.NewGORMMessageRepo(db)
	contactRepo := repository.NewGORMContactRepo(db)
	queueRepo := repository.NewGORMQueueRepo(db)
	userRepo := repository.NewGORMUserRepo(db)
	sessionRepo := repository.NewGORMChannelSessionRepo(db)
	hubManager := plugins.NewHubManager() // Instanciação explícita
	eventBus := NewInMemoryEventBus()
	logTicketAction := usecases.NewLogTicketActionUseCase(db)
	distributeTicket := usecases.NewDistributeTicketUseCase(ticketRepo, queueRepo, eventBus, db)
	updateTicket := usecases.NewUpdateTicketUseCase(ticketRepo, eventBus, distributeTicket, logTicketAction)
	receiveMessage := usecases.NewReceiveMessageUseCase(eventBus, messageRepo, contactRepo, ticketRepo)
	sessionService := services.NewWhatsAppSessionService(db, publisher, redisSvc, broadcast)
	return &Container{
		DB:                db,
		TicketRepo:        ticketRepo,
		MessageRepo:       messageRepo,
		ContactRepo:       contactRepo,
		QueueRepo:         queueRepo,
		UserRepo:          userRepo,
		ChannelSessionRepo: sessionRepo,
		HubManager:        hubManager,
		EventBus:          eventBus,
		RedisSvc:          redisSvc,
		Broadcast:         broadcast,
		SessionService:    sessionService,
		ReceiveMessage:    receiveMessage,
		DistributeTicket:  distributeTicket,
		UpdateTicket:      updateTicket,
		LogTicketAction:   logTicketAction,
	}
}
