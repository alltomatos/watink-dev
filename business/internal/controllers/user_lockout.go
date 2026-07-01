package controllers

import (
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// isTenantOwner reports whether userID is the Tenant.OwnerID — the owner is
// blindado (ADR 0022): sempre Administrador, nunca removido nem rebaixado.
func isTenantOwner(db *gorm.DB, userID int, tenantID uuid.UUID) bool {
	var tenant models.Tenant
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where("id = ?", tenantID).First(&tenant).Error; err != nil {
		return false
	}
	return tenant.OwnerID != nil && *tenant.OwnerID == userID
}

// isLastAdminOfTenant reports whether userID is the only User in the tenant
// whose Cargo is named "Administrador" — removendo/rebaixando ele deixaria o
// tenant sem nenhum Administrador (anti-lockout, ADR 0022).
func isLastAdminOfTenant(db *gorm.DB, userID int, tenantID uuid.UUID) bool {
	var user models.User
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where(`id = ? AND "tenantId" = ?`, userID, tenantID).First(&user).Error; err != nil || user.CargoID == nil {
		return false
	}
	var cargo models.Cargo
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where(`id = ? AND "tenantId" = ?`, *user.CargoID, tenantID).First(&cargo).Error; err != nil {
		return false
	}
	if cargo.Name != "Administrador" {
		return false
	}
	var count int64
	db.Session(&gorm.Session{NewDB: true}).Model(&models.User{}).
		Where(`"tenantId" = ? AND "cargoId" = ?`, tenantID, cargo.ID).
		Count(&count)
	return count <= 1
}

// isCargoAdministrador reports whether cargoID points to the Cargo named
// "Administrador" in the tenant. Used to allow the owner/last-admin's cargoId
// to change ONLY between Administrador cargos (e.g. a rename), never away
// from the role entirely.
func isCargoAdministrador(db *gorm.DB, cargoID *int, tenantID uuid.UUID) bool {
	if cargoID == nil {
		return false
	}
	var cargo models.Cargo
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where(`id = ? AND "tenantId" = ?`, *cargoID, tenantID).First(&cargo).Error; err != nil {
		return false
	}
	return cargo.Name == "Administrador"
}
