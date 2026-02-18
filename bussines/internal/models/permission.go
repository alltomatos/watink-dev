package models

import (
	"time"
)

type Permission struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Resource    string    `json:"resource"`
	Action      string    `json:"action"`
	Description string    `json:"description"`
	IsSystem    bool      `gorm:"column:isSystem;default:true" json:"isSystem"`
	CreatedAt   time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Permission) TableName() string {
	return "Permissions"
}

// Name is a virtual field
func (p Permission) GetName() string {
	return p.Resource + ":" + p.Action
}
