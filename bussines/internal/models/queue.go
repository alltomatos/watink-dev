package models

import (
	"time"

	"github.com/google/uuid"
)

type Queue struct {
	ID              int       `gorm:"primaryKey" json:"id"`
	Name            string    `gorm:"unique;not null" json:"name"`
	Color           string    `gorm:"unique;not null" json:"color"`
	GreetingMessage string    `gorm:"column:greetingMessage" json:"greetingMessage"`
	TenantID        uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt       time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt       time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Queue) TableName() string {
	return "Queues"
}
