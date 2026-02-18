package models

import (
	"time"

	"github.com/google/uuid"
)

type Contact struct {
	ID            int       `gorm:"primaryKey" json:"id"`
	Name          string    `gorm:"not null" json:"name"`
	Number        string    `gorm:"unique" json:"number"`
	ProfilePicUrl string    `gorm:"column:profilePicUrl" json:"profilePicUrl"`
	Email         string    `gorm:"not null;default:''" json:"email"`
	IsGroup       bool      `gorm:"column:isGroup;not null;default:false" json:"isGroup"`
	TenantID      uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	Lid           string    `gorm:"unique" json:"lid"`
	CreatedAt     time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Tickets []Ticket `gorm:"foreignKey:ContactID" json:"tickets,omitempty"`
}

func (Contact) TableName() string {
	return "Contacts"
}
