package models

import (
	"time"

	"github.com/google/uuid"
)

type TicketLog struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	TicketID  int       `gorm:"column:ticketId;not null" json:"ticketId"`
	UserID    *int      `gorm:"column:userId" json:"userId"`
	Type      string    `gorm:"not null" json:"type"` // transfer, close, open, create
	Payload   string    `gorm:"type:text" json:"payload"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`

	// Relations
	Ticket Ticket `gorm:"foreignKey:TicketID" json:"ticket,omitempty"`
	User   User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (TicketLog) TableName() string {
	return "TicketLogs"
}
