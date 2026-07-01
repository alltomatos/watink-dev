package models

import (
	"time"

	"github.com/google/uuid"
)

// Cargo represents a named set of Permissions — o que o usuário pode fazer.
// Renomeia Role (ADR 0022): único container de permissão, sem duplicação por
// Setor. M2M com Permission via cargo_permissoes.
type Cargo struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	IsSystem    bool      `gorm:"column:isSystem;default:false" json:"isSystem"`
	TenantID    uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt   time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	Permissions []Permission `gorm:"many2many:cargo_permissoes;joinForeignKey:cargoId;joinReferences:permissionId" json:"permissions,omitempty"`
}

func (Cargo) TableName() string { return "Cargos" }
