package models

import (
	"time"

	"github.com/google/uuid"
)

type KnowledgeBaseSource struct {
	ID              int       `gorm:"primaryKey" json:"id"`
	KnowledgeBaseID int       `gorm:"column:knowledgeBaseId;not null" json:"knowledgeBaseId"`
	TenantID        uuid.UUID `gorm:"column:tenantId;type:uuid;not null" json:"tenantId"`
	Type            string    `gorm:"not null" json:"type"`
	URL             string    `json:"url"`
	FileName        string    `gorm:"column:fileName" json:"fileName"`
	Status          string    `gorm:"default:'ready'" json:"status"`
	CreatedAt       time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt       time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (KnowledgeBaseSource) TableName() string {
	return "KnowledgeBaseSources"
}
