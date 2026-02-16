package models

import (
	"time"

	"github.com/google/uuid"
)

type Protocol struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Number      string    `gorm:"unique;not null" json:"number"`
	Status      string    `gorm:"default:'open'" json:"status"`
	Subject     string    `json:"subject"`
	Description string    `json:"description"`
	ContactID   int       `gorm:"column:contactId" json:"contactId"`
	TicketID    *int      `gorm:"column:ticketId" json:"ticketId"`
	TenantID    uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt   time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Contact Contact `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
}

func (Protocol) TableName() string {
	return "Protocols"
}
