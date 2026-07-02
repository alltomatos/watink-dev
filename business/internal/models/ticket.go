package models

import (
	"time"

	"github.com/google/uuid"
)

type Ticket struct {
	ID             int       `gorm:"primaryKey" json:"id"`
	Status         string    `gorm:"not null;default:'pending'" json:"status"`
	LastMessage    string    `gorm:"column:lastMessage" json:"lastMessage"`
	ContactID      int       `gorm:"column:contactId" json:"contactId"`
	UserID         *int      `gorm:"column:userId" json:"userId"`
	WhatsappID     int       `gorm:"column:whatsappId" json:"whatsappId"`
	IsGroup        bool      `gorm:"column:isGroup;not null;default:false" json:"isGroup"`
	IsCommunity    bool      `gorm:"column:isCommunity;not null;default:false" json:"isCommunity"`
	IsSubGroup     bool      `gorm:"column:isSubGroup;not null;default:false" json:"isSubGroup"`
	UnreadMessages int       `gorm:"column:unreadMessages" json:"unreadMessages"`
	QueueID        *int      `gorm:"column:queueId" json:"queueId"`
	TenantID       uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt      time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt      time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Contact  Contact   `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	User     User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Messages []Message `gorm:"foreignKey:TicketID" json:"messages,omitempty"`

	// Tags is populated manually (batch query via EntityTags) by ListTickets —
	// not a GORM association, since EntityTag is polymorphic (entityType+entityId).
	Tags []Tag `gorm:"-" json:"tags,omitempty"`
}

func (Ticket) TableName() string {
	return "Tickets"
}
