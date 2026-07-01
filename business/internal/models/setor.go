package models

import (
	"time"

	"github.com/google/uuid"
)

// Setor represents an organizational sector/department within a tenant.
// Substitui Group: agrupa usuários (N:N via UserSetor) para fins de
// organização/gestão/visibilidade de Tickets — não confundir com Queue
// (mecanismo de roteamento). Ver docs/adr/0022-acessos-cargo-setor-alcance.md.
type Setor struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Setor) TableName() string {
	return "Setores"
}
