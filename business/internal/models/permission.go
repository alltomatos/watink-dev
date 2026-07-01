package models

import (
	"fmt"
	"time"
)

type Permission struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Resource    string    `gorm:"not null" json:"resource"`
	Action      string    `gorm:"not null" json:"action"`
	Description string    `json:"description"`
	IsSystem    bool      `gorm:"column:isSystem;default:true" json:"isSystem"`
	CreatedAt   time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Permission) TableName() string { return "Permissions" }

func (p *Permission) GetName() string {
	return fmt.Sprintf("%s:%s", p.Resource, p.Action)
}
