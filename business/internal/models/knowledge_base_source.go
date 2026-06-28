package models

import (
	"time"

	"github.com/google/uuid"
)

type KnowledgeBaseSource struct {
	ID              int        `gorm:"primaryKey" json:"id"`
	KnowledgeBaseID int        `gorm:"column:knowledgeBaseId;not null" json:"knowledgeBaseId"`
	TenantID        uuid.UUID  `gorm:"column:tenantId;type:uuid;not null" json:"tenantId"`
	Type            string     `gorm:"not null" json:"type"`
	URL             string     `json:"url"`
	FileName        string     `gorm:"column:fileName" json:"fileName"`
	ObjectKey       string     `gorm:"column:objectKey" json:"objectKey"`
	Status          string     `gorm:"default:'ready'" json:"status"`
	LastError       string     `gorm:"column:lastError" json:"lastError"`
	ChunkCount      int        `gorm:"column:chunkCount;default:0" json:"chunkCount"`
	LastIngestedAt  *time.Time `gorm:"column:lastIngestedAt" json:"lastIngestedAt"`
	Updatable       bool       `gorm:"column:updatable;default:false" json:"updatable"`
	RefreshSchedule *string    `gorm:"column:refreshSchedule" json:"refreshSchedule"`
	NextRefreshAt   *time.Time `gorm:"column:nextRefreshAt" json:"nextRefreshAt"`
	CreatedAt       time.Time  `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt       time.Time  `gorm:"column:updatedAt" json:"updatedAt"`
}

func (KnowledgeBaseSource) TableName() string {
	return "KnowledgeBaseSources"
}
