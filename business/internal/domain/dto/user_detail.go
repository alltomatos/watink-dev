package dto

import "github.com/alltomatos/watinkdev/business/internal/domain"

// UserDetailResponse enriquecido para o endpoint de detalhe do usuário
type UserDetailResponse struct {
	ID           int                    `json:"id"`
	Name         string                 `json:"name"`
	Email        string                 `json:"email"`
	Profile      string                 `json:"profile"`
	WhatsappID   *int                   `json:"whatsappId"`
	TenantID     string                 `json:"tenantId"`
	GroupID      *int                   `json:"groupId"`
	Configs      string                 `json:"configs"`
	Queues       []domain.Queue         `json:"queues,omitempty"`
	Permissions  []PermissionSummary    `json:"permissions,omitempty"`
	Roles        []RoleSummary          `json:"roles,omitempty"`
	CreatedAt    string                 `json:"createdAt"`
	UpdatedAt    string                 `json:"updatedAt"`
}

// PermissionSummary resumo de permissão
type PermissionSummary struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// RoleSummary resumo de role
type RoleSummary struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}