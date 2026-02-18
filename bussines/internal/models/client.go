package models

import (
	"time"

	"github.com/google/uuid"
)

type Client struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Document  string    `json:"document"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Client) TableName() string {
	return "Clients"
}
