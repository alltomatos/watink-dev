package models

import (
	"time"

	"github.com/google/uuid"
)

type Group struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Permissions []Permission `gorm:"many2many:group_permissions;joinForeignKey:groupId;joinReferences:permissionId" json:"permissions,omitempty"`
	Roles       []Role       `gorm:"many2many:group_roles;joinForeignKey:groupId;joinReferences:roleId" json:"roles,omitempty"`
}

func (Group) TableName() string {
	return "Groups"
}
