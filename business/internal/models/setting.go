package models

import (
	"time"

	"github.com/google/uuid"
)

type Setting struct {
	Key       string    `gorm:"primaryKey" json:"key"`
	Value     string    `json:"value"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid;primaryKey" json:"tenantId"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Tenant Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
}

func (Setting) TableName() string {
	return "Settings"
}
