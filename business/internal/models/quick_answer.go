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
	DataJson  string    `gorm:"column:dataJson;type:jsonb;default:'null'" json:"dataJson"`
	Type      string    `gorm:"column:type;default:'text'" json:"type"`
	Content   string    `gorm:"column:content;type:jsonb;default:'null'" json:"content"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (QuickAnswer) TableName() string {
	return "QuickAnswers"
}
