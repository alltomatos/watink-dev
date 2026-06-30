package models

import (
	"time"

	"github.com/google/uuid"
)

// Proxy is a tenant-scoped outbound proxy used to give a WhatsApp connection its
// own sticky egress IP (anti-ban posture, ADR 0016). The password is stored
// encrypted-at-rest (cryptobox/AES-GCM) in PasswordEnc and is never serialized.
//
// Status lifecycle:
//   - active   — available for assignment / in use
//   - isolated — quarantined after a linked connection was banned, so its IP is
//     not reused by other connections (cross-contamination guard)
//   - banned   — confirmed burned IP
//   - disabled — manually parked
type Proxy struct {
	ID       int       `gorm:"primaryKey" json:"id"`
	TenantID uuid.UUID `gorm:"column:tenantId;type:uuid;index" json:"tenantId"`
	Label    string    `gorm:"column:label" json:"label"`
	Scheme   string    `gorm:"column:scheme;default:'http'" json:"scheme"` // http | socks5 (https NÃO suportado pelo whatsmeow)
	Host     string    `gorm:"column:host;not null" json:"host"`
	Port     int       `gorm:"column:port;not null" json:"port"`
	Username string    `gorm:"column:username" json:"username"`
	// PasswordEnc holds the AES-GCM ciphertext of the proxy password. json:"-"
	// guarantees the secret never leaves the backend in any response.
	PasswordEnc   string     `gorm:"column:passwordEnc;type:text" json:"-"`
	Status        string     `gorm:"column:status;default:'active'" json:"status"`
	Healthy       bool       `gorm:"column:healthy;default:false" json:"healthy"`
	LastCheckedAt *time.Time `gorm:"column:lastCheckedAt" json:"lastCheckedAt"`
	LastUsedAt    *time.Time `gorm:"column:lastUsedAt" json:"lastUsedAt"`
	Notes         string     `gorm:"column:notes" json:"notes"`
	CreatedAt     time.Time  `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt     time.Time  `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Proxy) TableName() string { return "Proxies" }

// HasPassword reports whether a credential is stored (without exposing it).
// Lets the API tell the UI "a senha existe" so edit forms can leave the field
// blank and only overwrite when the user types a new value.
func (p Proxy) HasPassword() bool { return p.PasswordEnc != "" }
