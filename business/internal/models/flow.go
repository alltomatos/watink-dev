package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Flow struct {
	ID         int            `gorm:"primaryKey" json:"id"`
	Name       string         `json:"name"`
	Nodes      datatypes.JSON `gorm:"type:json" json:"nodes"`
	Edges      datatypes.JSON `gorm:"type:json" json:"edges"`
	Active     bool           `gorm:"default:true" json:"active"`
	WhatsAppID *int           `gorm:"column:whatsappId" json:"whatsappId"`
	TenantID   uuid.UUID      `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt  time.Time      `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt  time.Time      `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Flow) TableName() string {
	return "Flows"
}
