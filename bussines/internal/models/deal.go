package models

import (
	"time"

	"github.com/google/uuid"
)

type Deal struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Value     float64   `gorm:"type:decimal(10,2);default:0" json:"value"`
	Status    string    `gorm:"default:'open'" json:"status"`
	StageID   int       `gorm:"column:stageId" json:"stageId"`
	ContactID int       `gorm:"column:contactId" json:"contactId"`
	TicketID  *int      `gorm:"column:ticketId" json:"ticketId"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Contact Contact       `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	Stage   PipelineStage `gorm:"foreignKey:StageID" json:"stage,omitempty"`
}

func (Deal) TableName() string {
	return "Deals"
}
