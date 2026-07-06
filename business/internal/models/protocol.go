package models

import (
	"time"

	"github.com/google/uuid"
)

// Protocol é o registro de atendimento do módulo Helpdesk (ADR 0024 —
// feature de plugin). Restaurado da stack legada: protocolNumber é
// data+aleatório (NÃO único — sem constraint unique, apenas índice) e token é
// a chave de acesso da página pública (/public/protocols/:token).
type Protocol struct {
	ID             int        `gorm:"primaryKey" json:"id"`
	ProtocolNumber string     `gorm:"column:protocolNumber;index" json:"protocolNumber"`
	Token          string     `gorm:"column:token;index" json:"token"`
	Subject        string     `json:"subject"`
	Description    string     `json:"description"`
	Status         string     `gorm:"default:'open'" json:"status"`
	Priority       string     `gorm:"default:'medium'" json:"priority"`
	Category       string     `json:"category"`
	ContactID      *int       `gorm:"column:contactId" json:"contactId"`
	TicketID       *int       `gorm:"column:ticketId" json:"ticketId"`
	UserID         *int       `gorm:"column:userId" json:"userId"`
	DueDate        *time.Time `gorm:"column:dueDate" json:"dueDate"`
	ResolvedAt     *time.Time `gorm:"column:resolvedAt" json:"resolvedAt"`
	ClosedAt       *time.Time `gorm:"column:closedAt" json:"closedAt"`
	TenantID       uuid.UUID  `gorm:"column:tenantId;type:uuid;index" json:"tenantId"`
	CreatedAt      time.Time  `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt      time.Time  `gorm:"column:updatedAt" json:"updatedAt"`

	// Relations
	Contact     *Contact             `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	User        *User                `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Ticket      *Ticket              `gorm:"foreignKey:TicketID" json:"ticket,omitempty"`
	History     []ProtocolHistory    `gorm:"foreignKey:ProtocolID" json:"history,omitempty"`
	Attachments []ProtocolAttachment `gorm:"foreignKey:ProtocolID" json:"attachments,omitempty"`
}

func (Protocol) TableName() string {
	return "Protocols"
}

// ProtocolHistory é o log imutável de eventos de um protocolo (criação,
// mudança de status/prioridade, comentário, anexo). `Changes` carrega o JSON
// dos anexos para a timeline (chave "files"). Sem updatedAt (append-only).
type ProtocolHistory struct {
	ID            int       `gorm:"primaryKey" json:"id"`
	ProtocolID    int       `gorm:"column:protocolId;index" json:"protocolId"`
	UserID        *int      `gorm:"column:userId" json:"userId"`
	Action        string    `json:"action"`
	PreviousValue string    `gorm:"column:previousValue" json:"previousValue"`
	NewValue      string    `gorm:"column:newValue" json:"newValue"`
	Comment       string    `json:"comment"`
	Changes       string    `gorm:"type:jsonb;default:'{}'" json:"changes"`
	TenantID      uuid.UUID `gorm:"column:tenantId;type:uuid;index" json:"tenantId"`
	CreatedAt     time.Time `gorm:"column:createdAt" json:"createdAt"`

	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ProtocolHistory) TableName() string {
	return "ProtocolHistories"
}

// ProtocolAttachment é um arquivo anexado a um protocolo. FilePath é a URL
// pública-relativa servida em /public/... (mesmo driver de mídia do chat).
type ProtocolAttachment struct {
	ID           int       `gorm:"primaryKey" json:"id"`
	ProtocolID   int       `gorm:"column:protocolId;index" json:"protocolId"`
	FileName     string    `gorm:"column:fileName" json:"fileName"`
	OriginalName string    `gorm:"column:originalName" json:"originalName"`
	FilePath     string    `gorm:"column:filePath" json:"filePath"`
	FileType     string    `gorm:"column:fileType" json:"fileType"`
	FileSize     int64     `gorm:"column:fileSize" json:"fileSize"`
	UploadedBy   *int      `gorm:"column:uploadedBy" json:"uploadedBy"`
	TenantID     uuid.UUID `gorm:"column:tenantId;type:uuid;index" json:"tenantId"`
	CreatedAt    time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (ProtocolAttachment) TableName() string {
	return "ProtocolAttachments"
}
