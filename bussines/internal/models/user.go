package models

import (
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID           int       `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"not null" json:"name"`
	Email        string    `gorm:"unique;not null" json:"email"`
	PasswordHash string    `gorm:"column:passwordHash;not null" json:"-"`
	TokenVersion int       `gorm:"column:tokenVersion;default:0" json:"tokenVersion"`
	Profile      string    `gorm:"default:'admin'" json:"profile"`
	WhatsappID   *int      `gorm:"column:whatsappId" json:"whatsappId"`
	TenantID     uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	GroupID      *int      `gorm:"column:groupId" json:"groupId"`
	Configs      string    `gorm:"type:json" json:"configs"`
	CreatedAt    time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Tenant      Tenant       `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Queues      []Queue      `gorm:"many2many:UserQueues;" json:"queues,omitempty"`
	Permissions []Permission `gorm:"many2many:UserPermissions;" json:"permissions,omitempty"`
	Roles       []Role       `gorm:"many2many:UserRoles;" json:"roles,omitempty"`
}

func (User) TableName() string {
	return "Users"
}

func (u *User) HashPassword(password string) error {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 8)
	if err != nil {
		return err
	}
	u.PasswordHash = string(bytes)
	return nil
}

func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

func (u *User) BeforeSave(tx *gorm.DB) (err error) {
	return nil
}
