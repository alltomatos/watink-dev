package models

import (
	"time"

	"github.com/google/uuid"
)

// PluginInstallation is the core-side ALLOCATION record: which plugin
// (identified by pluginSlug from the Hub catalog) is enabled for which
// tenant. It is NOT the source of truth for licensing — that lives in the
// plugin-manager (cache of the Hub's signed Ed25519 token). PluginRegistry.
// GetStatus crosses license (plugin-manager) x allocation (this table) at
// runtime. See docs/adr/0024-plugin-marketplace-licensing-redesign.md and
// docs/agents/plugins.md.
type PluginInstallation struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"column:tenantId;type:uuid;not null;index" json:"tenantId"`

	// PluginID is the pluginSlug from the Hub catalog (e.g. "helpdesk",
	// "webchat") — a string slug, NOT a foreign key to another table.
	PluginID string `gorm:"column:pluginId;not null" json:"pluginId"`

	Active bool `gorm:"column:active;not null;default:true" json:"active"`

	// ActivatedAt/ActivatedBy are for audit of the activation action, never
	// consulted as license authority.
	ActivatedAt *time.Time `gorm:"column:activatedAt" json:"activatedAt,omitempty"`
	ActivatedBy *uuid.UUID `gorm:"column:activatedBy;type:uuid" json:"activatedBy,omitempty"`

	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (PluginInstallation) TableName() string {
	return "PluginInstallations"
}
