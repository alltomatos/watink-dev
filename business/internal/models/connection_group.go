package models

import (
	"time"

	"github.com/google/uuid"
)

// ConnectionGroup is a named grouping of WhatsApp connections, used to organize
// and operate on connections together (e.g. assign a shared proxy strategy or
// bulk-manage). A connection belongs to at most one group via
// Whatsapp.ConnectionGroupID.
type ConnectionGroup struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid;index" json:"tenantId"`
	Name      string    `gorm:"column:name;not null" json:"name"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (ConnectionGroup) TableName() string { return "ConnectionGroups" }
