package domain

import (
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// Ticket represents a support ticket in the system
type Ticket struct {
	ID             int       `json:"id"`
	Status         string    `json:"status"`
	LastMessage    string    `json:"lastMessage"`
	ContactID      int       `json:"contactId"`
	UserID         *int      `json:"userId"`
	WhatsappID     int       `json:"whatsappId"`
	IsGroup        bool      `json:"isGroup"`
	IsCommunity    bool      `json:"isCommunity"`
	IsSubGroup     bool      `json:"isSubGroup"`
	UnreadMessages int       `json:"unreadMessages"`
	QueueID        *int      `json:"queueId"`
	TenantID       uuid.UUID `json:"tenantId"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// Message represents a message in a ticket conversation
type Message struct {
	ID          string    `json:"id"`
	Body        string    `json:"body"`
	Ack         int       `json:"ack"`
	Read        bool      `json:"read"`
	MediaType   string    `json:"mediaType"`
	MediaUrl    string    `json:"mediaUrl"`
	TicketID    int       `json:"ticketId"`
	FromMe      bool      `json:"fromMe"`
	IsDeleted   bool      `json:"isDeleted"`
	ContactID   *int      `json:"contactId"`
	QuotedMsgID *string   `json:"quotedMsgId"`
	TenantID    uuid.UUID `json:"tenantId"`
	Reactions   string    `json:"reactions"`
	DataJson    string    `json:"dataJson"`
	Participant string    `json:"participant"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Contact represents a customer contact
type Contact struct {
	ID            int       `json:"id"`
	Name          string    `json:"name"`
	Number        string    `json:"number"`
	ProfilePicUrl string    `json:"profilePicUrl"`
	Email         string    `json:"email"`
	IsGroup       bool      `json:"isGroup"`
	TenantID      uuid.UUID `json:"tenantId"`
	Lid           *string   `json:"lid"`
	WalletUserID  *int      `json:"walletUserId"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// Queue represents a support queue with distribution settings
type QueueWhatsapp struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	Number string `json:"number"`
}

type Queue struct {
	ID                   int             `json:"id"`
	Name                 string          `json:"name"`
	Color                string          `json:"color"`
	GreetingMessage      string          `json:"greetingMessage"`
	DistributionStrategy string          `json:"distributionStrategy"`
	PrioritizeWallet     bool            `json:"prioritizeWallet"`
	ParentID             *int            `json:"parentId"`
	TenantID             uuid.UUID       `json:"tenantId"`
	Whatsapps            []QueueWhatsapp `json:"whatsapps,omitempty"`
	CreatedAt            time.Time       `json:"createdAt"`
	UpdatedAt            time.Time       `json:"updatedAt"`
}

// User represents a system user (agent/admin)
type User struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	TokenVersion int       `json:"tokenVersion"`
	Profile      string    `json:"profile"`
	WhatsappID   *int      `json:"whatsappId"`
	TenantID     uuid.UUID `json:"tenantId"`
	GroupID      *int      `json:"groupId"`
	Configs      string    `json:"configs"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`

	// Permissions are the user's EFFECTIVE permission names ("resource:action"),
	// aggregated from the user's direct grants + their group's grants. Returned
	// by the auth endpoints so the frontend Can gate (perform="flows:read" etc.)
	// works for non-admin profiles. Empty for callers that don't populate it.
	Permissions []string `json:"permissions"`
}

func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

// ChannelSession represents a session with a messaging channel (WhatsApp, Telegram, etc.)
type ChannelSession struct {
	ID              int        `json:"id"`
	Session         string     `json:"session"`
	Qrcode          string     `json:"qrcode"`
	Status          string     `json:"status"`
	Battery         string     `json:"battery"`
	Plugged         bool       `json:"plugged"`
	Name            string     `json:"name"`
	IsDefault       bool       `json:"isDefault"`
	Retries         int        `json:"retries"`
	GreetingMessage string     `json:"greetingMessage"`
	FarewellMessage string     `json:"farewellMessage"`
	TenantID        uuid.UUID  `json:"tenantId"`
	SyncHistory     bool       `json:"syncHistory"`
	SyncPeriod      string     `json:"syncPeriod"`
	Number          string     `json:"number"`
	ProfilePicUrl   string     `json:"profilePicUrl"`
	KeepAlive       bool       `json:"keepAlive"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	FirstConnection *time.Time `json:"firstConnection"`
	LastConnectedAt *time.Time `json:"lastConnectedAt"`
	EngineType      string     `json:"engineType"`
}
