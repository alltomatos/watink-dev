package models

import (
	"time"

	"github.com/google/uuid"
)

// ProxyGroup is a named pool of proxies a connection can draw from. The rotation
// strategy decides how a connection picks its egress IP from the pool:
//   - sticky — keep the same proxy for the connection's lifetime (re-pick only
//     if the current one leaves the active pool, e.g. isolated after a ban)
//   - rotate — pick the least-recently-used active proxy on each (re)connect,
//     so the IP changes over time ("conexão compartilhada que troca de IP")
type ProxyGroup struct {
	ID               int       `gorm:"primaryKey" json:"id"`
	TenantID         uuid.UUID `gorm:"column:tenantId;type:uuid;index" json:"tenantId"`
	Name             string    `gorm:"column:name;not null" json:"name"`
	RotationStrategy string    `gorm:"column:rotationStrategy;default:'sticky'" json:"rotationStrategy"`
	CreatedAt        time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt        time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (ProxyGroup) TableName() string { return "ProxyGroups" }
