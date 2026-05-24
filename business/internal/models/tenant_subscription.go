package models

import (
	"time"

	"github.com/google/uuid"
)

type TenantSubscription struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID  uuid.UUID  `gorm:"column:tenantId;type:uuid;not null" json:"tenantId"`
	PlanID    int        `gorm:"column:planId;not null" json:"planId"`
	Status    string     `gorm:"default:'active'" json:"status"` // active, trialing, expired, canceled
	ExpiresAt *time.Time `gorm:"column:expiresAt" json:"expiresAt"`
	CreatedAt time.Time  `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time  `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Tenant Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Plan   Plan   `gorm:"foreignKey:PlanID" json:"plan,omitempty"`
}

func (TenantSubscription) TableName() string {
	return "TenantSubscriptions"
}
