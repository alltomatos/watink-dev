package application

import (
	"log"

	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/infrastructure/repository"
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
	PermissionRepo     domain.PermissionRepository
	SettingRepo        domain.SettingRepository
	SystemRepo         domain.SystemRepository
	PlanLimitSvc      domain.PlanLimitServiceInterface
	SwaggerPermRepo   domain.SwaggerPermissionRepository
	VersionRepo       domain.VersionRepository
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
		log.Fatal("NewContainer: db is required — pass a valid *gorm.DB instance")
	}
	ticketRepo := repository.NewGORMTicketRepo(db)
	messageRepo := repository.NewGORMMessageRepo(db)
	contactRepo := repository.NewGORMContactRepo(db)
	queueRepo := repository.NewGORMQueueRepo(db)
	userRepo := repository.NewGORMUserRepo(db)
	sessionRepo := repository.NewGORMChannelSessionRepo(db)
	permissionRepo := repository.NewGORMPermissionRepo(db)
	settingRepo := repository.NewGORMSettingRepo(db)
	systemRepo := repository.NewGORMSystemRepo(db)
	planLimitSvc := services.NewPlanLimitService(db)
	swaggerPermRepo := repository.NewGORMSwaggerPermissionRepo(db)
	versionRepo := repository.NewGORMVersionRepo(db)
	userQueueRepo := repository.NewGormUserQueueRepository(db)
	ticketLogRepo := repository.NewGormTicketLogRepository(db)
	eventBus := NewInMemoryEventBus()
	logTicketAction := usecases.NewLogTicketActionUseCase(ticketRepo, ticketLogRepo)
	distributeTicket := usecases.NewDistributeTicketUseCase(ticketRepo, queueRepo, eventBus, contactRepo, userQueueRepo)
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
		PermissionRepo:     permissionRepo,
		SettingRepo:        settingRepo,
		SystemRepo:         systemRepo,
		PlanLimitSvc:      planLimitSvc,
		SwaggerPermRepo:   swaggerPermRepo,
		VersionRepo:       versionRepo,
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
