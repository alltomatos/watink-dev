package models

import (
	"time"
)

type Plan struct {
	ID               int       `gorm:"primaryKey" json:"id"`
	Name             string    `gorm:"unique;not null" json:"name"`
	UsersLimit       int       `gorm:"column:usersLimit;default:0" json:"usersLimit"`
	ConnectionsLimit int       `gorm:"column:connectionsLimit;default:0" json:"connectionsLimit"`
	QueuesLimit      int       `gorm:"column:queuesLimit;default:0" json:"queuesLimit"`
	PluginQuota      int       `gorm:"column:pluginQuota;default:0" json:"pluginQuota"`
	Price            float64   `gorm:"type:decimal(10,2)" json:"price"`
	Active           bool      `gorm:"default:true" json:"active"`
	CreatedAt        time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt        time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Plan) TableName() string {
	return "Plans"
}
