package models

import (
	"time"

	"github.com/google/uuid"
)

type TagGroup struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (TagGroup) TableName() string { return "TagGroups" }

type Tag struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Color       string    `gorm:"default:blue" json:"color"`
	Icon        string    `json:"icon"`
	Description string    `json:"description"`
	Archived    bool      `gorm:"default:false" json:"archived"`
	GroupID     *int      `gorm:"column:groupId" json:"groupId"`
	TenantID    uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt   time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	Group *TagGroup `gorm:"foreignKey:GroupID" json:"group,omitempty"`
}

func (Tag) TableName() string { return "Tags" }

type EntityTag struct {
	ID         int       `gorm:"primaryKey" json:"id"`
	TagID      int       `gorm:"column:tagId;not null" json:"tagId"`
	EntityType string    `gorm:"column:entityType;not null" json:"entityType"`
	EntityID   int       `gorm:"column:entityId;not null" json:"entityId"`
	TenantID   uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt  time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt  time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (EntityTag) TableName() string { return "EntityTags" }
