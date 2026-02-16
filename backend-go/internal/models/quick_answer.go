package models

import (
	"time"

	"github.com/google/uuid"
)

type QuickAnswer struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Shortcut  string    `gorm:"not null" json:"shortcut"`
	Message   string    `gorm:"not null" json:"message"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	MediaType string    `gorm:"column:mediaType" json:"mediaType"`
	DataJson  string    `gorm:"column:dataJson;type:jsonb" json:"dataJson"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (QuickAnswer) TableName() string {
	return "QuickAnswers"
}
