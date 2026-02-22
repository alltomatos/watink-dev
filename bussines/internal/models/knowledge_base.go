package models

import (
	"time"

	"github.com/google/uuid"
)

type KnowledgeBase struct {
	ID          int                   `gorm:"primaryKey" json:"id"`
	Name        string                `gorm:"not null" json:"name"`
	Description string                `json:"description"`
	TenantID    uuid.UUID             `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt   time.Time             `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt   time.Time             `gorm:"column:updatedAt" json:"updatedAt"`
	Sources     []KnowledgeBaseSource `gorm:"foreignKey:KnowledgeBaseID" json:"sources,omitempty"`
}

func (KnowledgeBase) TableName() string {
	return "KnowledgeBases"
}
