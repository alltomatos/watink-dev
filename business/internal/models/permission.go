package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Permission struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Resource    string    `gorm:"not null" json:"resource"`
	Action      string    `gorm:"not null" json:"action"`
	Description string    `json:"description"`
	IsSystem    bool      `gorm:"column:isSystem;default:true" json:"isSystem"`
	CreatedAt   time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Permission) TableName() string { return "Permissions" }

func (p *Permission) GetName() string {
	return fmt.Sprintf("%s:%s", p.Resource, p.Action)
}

type Role struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	IsSystem    bool      `gorm:"column:isSystem;default:false" json:"isSystem"`
	TenantID    uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt   time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	Permissions []Permission `gorm:"many2many:RolePermissions;" json:"permissions,omitempty"`
}

func (Role) TableName() string { return "Roles" }

type RolePermission struct {
	ID           int            `gorm:"primaryKey" json:"id"`
	RoleID       int            `gorm:"column:roleId" json:"roleId"`
	PermissionID int            `gorm:"column:permissionId" json:"permissionId"`
	Scope        datatypes.JSON `gorm:"type:jsonb" json:"scope"`      // Restriction like { "queueIds": [1,2] }
	Conditions   datatypes.JSON `gorm:"type:jsonb" json:"conditions"` // ABAC logic
	TenantID     uuid.UUID      `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt    time.Time      `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt    time.Time      `gorm:"column:updatedAt" json:"updatedAt"`
}

func (RolePermission) TableName() string { return "RolePermissions" }
