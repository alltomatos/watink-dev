package models

import (
	"time"

	"github.com/google/uuid"
)

// Cargo represents a named set of Permissions — o que o usuário pode fazer.
// Renomeia Role (ADR 0022): único container de permissão, sem duplicação por
// Setor. M2M com Permission via cargo_permissoes.
//
// Permissions NÃO usa a tag many2many do GORM: a API Association() resolve
// nomes de coluna da tabela de junção por conta própria, sem respeitar o
// struct de junção explícito (CargoPermissao), e força convenção snake_case mesmo com
// column: customizado — causando mismatch em runtime. Gerenciado manualmente
// via CargoPermissao (mesmo padrão de UserSetor/SetorFila): escrita por
// Create(), leitura por query explícita.
type Cargo struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	IsSystem    bool      `gorm:"column:isSystem;default:false" json:"isSystem"`
	TenantID    uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt   time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	Permissions []Permission `gorm:"-" json:"permissions,omitempty"`
}

func (Cargo) TableName() string { return "Cargos" }

// CargoPermissao is the explicit join table for the Cargo<->Permission
// many2many relation. Defined here (like UserQueue/UserSetor/SetorFila) so
// AutoMigrate creates camelCase columns (cargoId, permissionId) consistent
// with the rest of the schema — without it, GORM's implicit join table
// defaults to snake_case (cargo_id, permission_id).
type CargoPermissao struct {
	CargoID      int `gorm:"column:cargoId;primaryKey;not null"`
	PermissionID int `gorm:"column:permissionId;primaryKey;not null"`
}

func (CargoPermissao) TableName() string { return "cargo_permissoes" }
