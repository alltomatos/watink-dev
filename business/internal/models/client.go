package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Client is the core CRM entity (Pessoa Física/Jurídica), promoted from the
// old licensed "Gestão de Clientes" plugin (ADR 0023). It aggregates Contacts
// and Addresses; a Contact belongs to at most one Client via the nullable
// Contact.ClientID (see contact.go). Ticket/Deal never gain a desnormalized
// ClientID — history is always resolved transitively via
// Ticket.Contact.ClientID.
type Client struct {
	ID   int    `gorm:"primaryKey" json:"id"`
	Name string `gorm:"not null" json:"name"`
	// Type is "pf" (pessoa física) or "pj" (pessoa jurídica). Enum validation
	// happens in the controller, not here.
	Type string `gorm:"not null;default:'pf'" json:"type"`
	// SocialName is exclusive to PF (LGPD — Decreto 8.727/2016). When set, it
	// replaces the civil name on every display surface (ticket list, chat
	// bubble, header, notifications, Pipeline/Deal, Protocol, reports).
	SocialName *string `gorm:"column:socialName" json:"socialName"`
	// DocumentEnc holds the cryptobox (AES-GCM) ciphertext of the CPF/CNPJ,
	// mirroring Proxy.PasswordEnc (see proxy.go). json:"-" guarantees the
	// ciphertext never leaves the backend in a response. Encrypt/decrypt
	// happens in the controller, not here.
	DocumentEnc string `gorm:"column:documentEnc;type:text" json:"-"`
	// Document is a TRANSIENT (gorm:"-", not persisted) field the controller
	// populates in API responses after decrypting DocumentEnc. It exists so
	// JSON consumers keep seeing a plain "document" field — do not mistake it
	// for a duplicate/dead column.
	Document  string    `gorm:"-" json:"document"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Notes     string    `gorm:"column:notes" json:"notes"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid" json:"tenantId"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
	// DeletedAt enables soft-delete — Client is never hard-deleted (ADR 0023).
	// Swapping the controller's Delete() to soft-delete is out of scope here.
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Contacts  []Contact       `gorm:"foreignKey:ClientID" json:"contacts,omitempty"`
	Addresses []ClientAddress `gorm:"foreignKey:ClientID" json:"addresses,omitempty"`
}

func (Client) TableName() string {
	return "Clients"
}
