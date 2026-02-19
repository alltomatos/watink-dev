package models

import (
	"time"

	"github.com/google/uuid"
)

type Whatsapp struct {
	ID              int       `gorm:"primaryKey" json:"id"`
	Session         string    `json:"session"`
	Qrcode          string    `gorm:"type:text" json:"qrcode"`
	Status          string    `json:"status"`
	Battery         string    `json:"battery"`
	Plugged         bool      `json:"plugged"`
	Name            string    `gorm:"unique;not null" json:"name"`
	IsDefault       bool      `gorm:"column:isDefault;not null;default:false" json:"isDefault"`
	Retries         int       `gorm:"not null;default:0" json:"retries"`
	GreetingMessage string    `gorm:"column:greetingMessage" json:"greetingMessage"`
	FarewellMessage string    `gorm:"column:farewellMessage" json:"farewellMessage"`
	TenantID        uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	SyncHistory     bool      `gorm:"column:syncHistory;default:false" json:"syncHistory"`
	SyncPeriod      string    `gorm:"column:syncPeriod" json:"syncPeriod"`
	Number          string    `json:"number"`
	ProfilePicUrl   string    `gorm:"column:profilePicUrl" json:"profilePicUrl"`
	KeepAlive       bool      `gorm:"column:keepAlive;default:false" json:"keepAlive"`
	CreatedAt       time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt       time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Tickets []Ticket `gorm:"foreignKey:WhatsappID" json:"tickets,omitempty"`
}

func (Whatsapp) TableName() string {
	return "Whatsapps"
}
