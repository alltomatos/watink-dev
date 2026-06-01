package domain

import (
	"context"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
)

// Repository Interfaces

type TicketRepository interface {
	FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*Ticket, error)
	FindOpenByContact(ctx context.Context, tenantID uuid.UUID, contactID int, sessionID int) (*Ticket, error)
	FindOrCreatePending(ctx context.Context, ticket *Ticket) (*Ticket, error)
	Save(ctx context.Context, ticket *Ticket) error
	Update(ctx context.Context, ticket *Ticket, fields map[string]interface{}) error
}

type MessageRepository interface {
	Create(ctx context.Context, msg *Message) error
	CreateIfNotExists(ctx context.Context, msg *Message) error
	FindByID(ctx context.Context, id string, tenantID uuid.UUID) (*Message, error)
	ExistsByID(ctx context.Context, id string, tenantID uuid.UUID) (bool, error)
	Update(ctx context.Context, msg *Message, fields map[string]interface{}) error
}

type ContactRepository interface {
	FindByNumber(ctx context.Context, tenantID uuid.UUID, number string, isGroup bool) (*Contact, error)
	FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*Contact, error)
	Find(ctx context.Context, tenantID uuid.UUID, search string) ([]Contact, error)
	Create(ctx context.Context, contact *Contact) error
	Update(ctx context.Context, contact *Contact, fields map[string]interface{}) error
	Delete(ctx context.Context, id int, tenantID uuid.UUID) error
	FindOrCreate(ctx context.Context, tenantID uuid.UUID, number string, pushName string, profilePicUrl string, isGroup bool, isLID bool, from string) (*Contact, error)
}

type UserRepository interface {
	FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*User, error)
	FindByIDDetail(ctx context.Context, id int, tenantID uuid.UUID) (*models.User, error)
	FindByEmail(ctx context.Context, email string, tenantID uuid.UUID) (*User, error)
	FindByEmailForAuth(ctx context.Context, email string) (*User, error)
	FindAll(ctx context.Context, tenantID uuid.UUID) ([]User, error)
	Create(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User, fields map[string]interface{}) error
	Delete(ctx context.Context, id int, tenantID uuid.UUID) error
	Save(ctx context.Context, user *User) error
}

type QueueRepository interface {
	FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*Queue, error)
	FindAll(ctx context.Context, tenantID uuid.UUID) ([]Queue, error)
	Save(ctx context.Context, queue *Queue) error
}

type ChannelSessionRepository interface {
	FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*ChannelSession, error)
	FindByIDDetail(ctx context.Context, id int, tenantID uuid.UUID) (*models.Whatsapp, error)
	FindAll(ctx context.Context, tenantID uuid.UUID) ([]ChannelSession, error)
	Create(ctx context.Context, session *ChannelSession) error
	Update(ctx context.Context, session *ChannelSession, fields map[string]interface{}) error
	Delete(ctx context.Context, id int, tenantID uuid.UUID) error
	ResetDefaultFlag(ctx context.Context, tenantID uuid.UUID) error
	DeleteWithRelations(ctx context.Context, id int, tenantID uuid.UUID) error
}

// Channel Adapter Interface
type ChannelAdapter interface {
	SendMessage(ctx context.Context, ticket Ticket, message Message) error
	StartSession(ctx context.Context, session ChannelSession) error
	StopSession(ctx context.Context, sessionID int) error
	DeleteSession(ctx context.Context, sessionID int) error
}

// EventBus Interface
type EventBus interface {
	Publish(ctx context.Context, event DomainEvent) error
	Subscribe(eventName string, handler EventHandler) error
}

type EventHandler func(ctx context.Context, event DomainEvent) error

// RabbitMQServiceInterface defines the contract required by controllers that publish commands.
type RabbitMQServiceInterface interface {
	PublishCommand(routingKey string, payload interface{}) error
}
