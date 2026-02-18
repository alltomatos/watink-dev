package models

import (
	"github.com/google/uuid"
)

type Flow struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Name      string    `json:"name"`
	Nodes     string    `gorm:"type:json" json:"nodes"`
	Edges     string    `gorm:"type:json" json:"edges"`
	Active    bool      `gorm:"default:true" json:"active"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
}

func (Flow) TableName() string {
	return "Flows"
}
