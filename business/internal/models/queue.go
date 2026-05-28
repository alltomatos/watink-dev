package models

import (
	"time"

	"github.com/google/uuid"
)

type Queue struct {
	ID                   int       `gorm:"primaryKey" json:"id"`
	Name                 string    `gorm:"unique;not null" json:"name"`
	Color                string    `gorm:"unique;not null" json:"color"`
	GreetingMessage      string    `gorm:"column:greetingMessage" json:"greetingMessage"`
	DistributionStrategy string    `gorm:"column:distributionStrategy;default:'MANUAL'" json:"distributionStrategy"`
	PrioritizeWallet     bool      `gorm:"column:prioritizeWallet;default:false" json:"prioritizeWallet"`
	ParentID             *int      `gorm:"column:parentId" json:"parentId"`
	TenantID             uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt            time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt            time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Parent    *Queue     `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Whatsapps []Whatsapp `gorm:"many2many:whatsapp_queues;" json:"whatsapps,omitempty"`
}

func (Queue) TableName() string {
	return "Queues"
}
