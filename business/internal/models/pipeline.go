package models

import (
	"time"

	"github.com/google/uuid"
)

type Pipeline struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Stages []PipelineStage `gorm:"foreignKey:PipelineID" json:"stages,omitempty"`
}

func (Pipeline) TableName() string {
	return "Pipelines"
}

type PipelineStage struct {
	ID         int       `gorm:"primaryKey" json:"id"`
	Name       string    `gorm:"not null" json:"name"`
	PipelineID int       `gorm:"column:pipelineId;not null" json:"pipelineId"`
	Order      int       `gorm:"default:0" json:"order"`
	CreatedAt  time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt  time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (PipelineStage) TableName() string {
	return "PipelineStages"
}
