package repository

import (
	"context"
	"errors"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Compile-time interface check.
var _ domain.UserRepository = (*GORMUserRepository)(nil)

// GORMUserRepository implements domain.UserRepository using GORM.
type GORMUserRepository struct {
	db *gorm.DB
}

// NewGORMUserRepo constructs a GORMUserRepository.
func NewGORMUserRepo(db *gorm.DB) *GORMUserRepository {
	return &GORMUserRepository{db: db}
}

// FindByID returns the user with the given id under tenantID, or nil if not found.
// Effective permissions (Cargo) are populated so the refresh path keeps
// the frontend Can gate working across token refreshes.
func (r *GORMUserRepository) FindByID(ctx context.Context, id int, tenantID uuid.UUID) (*domain.User, error) {
	var m models.User
	err := r.db.WithContext(ctx).
		Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	du := userModelToDomain(&m)
	du.Permissions = r.effectivePermissionNames(ctx, m.ID, m.CargoID, m.TenantID)
	return du, nil
}

// FindByIDDetail returns the user with relations (Queues, Cargo.Permissions) loaded.
// Usado no endpoint de detalhe enriquecido.
func (r *GORMUserRepository) FindByIDDetail(ctx context.Context, id int, tenantID uuid.UUID) (*models.User, error) {
	var m models.User
	err := r.db.WithContext(ctx).
		Preload("Cargo").
		Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	if m.CargoID != nil {
		perms, permErr := loadCargoPermissions(ctx, r.db, *m.CargoID, tenantID)
		if permErr == nil {
			m.Cargo.Permissions = perms
		}
	}
	return &m, nil
}

// FindByEmail returns the user with the given email under tenantID, or nil if not found.
func (r *GORMUserRepository) FindByEmail(ctx context.Context, email string, tenantID uuid.UUID) (*domain.User, error) {
	var m models.User
	err := r.db.WithContext(ctx).
		Where("email = ? AND \"tenantId\" = ?", email, tenantID).
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return userModelToDomain(&m), nil
}

// FindByEmailForAuth returns the user by email across all tenants (login use only),
// with effective permissions (Cargo) populated for the frontend Can gate.
func (r *GORMUserRepository) FindByEmailForAuth(ctx context.Context, email string) (*domain.User, error) {
	var m models.User
	// Login case-insensitive (P2-6): casa por LOWER(email) para cobrir tanto os
	// emails já normalizados na escrita quanto dados legados com caixa mista.
	err := r.db.WithContext(ctx).
		Preload("Tenant").
		Where("LOWER(email) = LOWER(?)", email).
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	du := userModelToDomain(&m)
	du.Permissions = r.effectivePermissionNames(ctx, m.ID, m.CargoID, m.TenantID)
	return du, nil
}

// loadCargoPermissions loads a Cargo's Permissions via an explicit JOIN
// against cargo_permissoes (camelCase columns cargoId/permissionId). Not done
// via GORM's many2many Association()/Preload: that API resolves join-table
// column names independently of the explicit CargoPermissao struct and falls
// back to snake_case conventions, causing a runtime mismatch even though the
// table itself was created with the correct (camelCase) columns.
//
// Defense-in-depth (P2-1): também faz JOIN em "Cargos" filtrando por tenantId,
// para NUNCA resolver permissões de um Cargo de outro tenant caso um cargoId
// cross-tenant tenha vazado para a linha do usuário. O write-path (UpdateUser/
// CreateUser) já rejeita cargoId estrangeiro, mas o read-path não deve confiar
// nisso — Permissions é catálogo global, só o vínculo Cargo↔tenant é a barreira.
func loadCargoPermissions(ctx context.Context, db *gorm.DB, cargoID int, tenantID uuid.UUID) ([]models.Permission, error) {
	var perms []models.Permission
	err := db.WithContext(ctx).
		Table(`"Permissions"`).
		Joins(`JOIN cargo_permissoes ON cargo_permissoes."permissionId" = "Permissions".id`).
		Joins(`JOIN "Cargos" ON "Cargos".id = cargo_permissoes."cargoId"`).
		Where(`cargo_permissoes."cargoId" = ? AND "Cargos"."tenantId" = ?`, cargoID, tenantID).
		Find(&perms).Error
	return perms, err
}

// effectivePermissionNames aggregates a user's EFFECTIVE permission names
// ("resource:action") from their Cargo's grants (cargo_permissoes — ADR 0022),
// PLUS the Gestor package when the user is marked ehGestor=true in ANY
// user_setores row.
//
// The Gestor package is NOT "the user's CargoID equals the Gestor Cargo" —
// that would conflate Cargo (what the user does) with the ehGestor mark
// (where they manage). Instead: if user_setores has any row with
// ehGestor=true for this user, we look up the Cargo literally named "Gestor"
// within the same tenant and union its Permissions in. A user whose base
// Cargo is "Atendente" but who is marked ehGestor of "Vendas" still gets the
// Gestor package — scoped in practice by Alcance (RequirePermission +
// GetScopedDB), not by this name-based lookup.
//
// If the tenant has no Cargo literally named "Gestor" (future customization
// removed/renamed it), this simply contributes nothing extra — it does not
// create one and does not fail.
//
// Best-effort throughout: a load error yields fewer names, never an auth
// failure.
func (r *GORMUserRepository) effectivePermissionNames(ctx context.Context, userID int, cargoID *int, tenantID uuid.UUID) []string {
	set := make(map[string]struct{})

	if cargoID != nil {
		if perms, err := loadCargoPermissions(ctx, r.db, *cargoID, tenantID); err == nil {
			for i := range perms {
				set[perms[i].GetName()] = struct{}{}
			}
		}
	}

	if isGestorOfAnySetor(ctx, r.db, userID) {
		if gestorCargoID, ok := findGestorCargoID(ctx, r.db, tenantID); ok {
			if perms, err := loadCargoPermissions(ctx, r.db, gestorCargoID, tenantID); err == nil {
				for i := range perms {
					set[perms[i].GetName()] = struct{}{}
				}
			}
		}
	}

	names := make([]string, 0, len(set))
	for n := range set {
		names = append(names, n)
	}
	return names
}

// isGestorOfAnySetor reports whether userID has at least one user_setores
// row with ehGestor=true. Best-effort: any query error is treated as "not a
// gestor" (fail-closed on the extra grant, never on the base Cargo grant).
func isGestorOfAnySetor(ctx context.Context, db *gorm.DB, userID int) bool {
	var count int64
	err := db.WithContext(ctx).
		Model(&models.UserSetor{}).
		Where(`"userId" = ? AND "ehGestor" = true`, userID).
		Count(&count).Error
	return err == nil && count > 0
}

// findGestorCargoID looks up the Cargo literally named "Gestor" within
// tenantID. Returns ok=false (not an error) when the tenant has no such
// Cargo — a customized/renamed tenant simply gets no extra Gestor package.
func findGestorCargoID(ctx context.Context, db *gorm.DB, tenantID uuid.UUID) (int, bool) {
	var cargo models.Cargo
	err := db.WithContext(ctx).
		Where(`"name" = ? AND "tenantId" = ?`, "Gestor", tenantID).
		First(&cargo).Error
	if err != nil {
		return 0, false
	}
	return cargo.ID, true
}

// FindAll returns all users under tenantID.
func (r *GORMUserRepository) FindAll(ctx context.Context, tenantID uuid.UUID) ([]domain.User, error) {
	var ms []models.User
	err := r.db.WithContext(ctx).
		Where("\"tenantId\" = ?", tenantID).
		Find(&ms).Error
	if err != nil {
		return nil, err
	}
	users := make([]domain.User, len(ms))
	for i := range ms {
		users[i] = *userModelToDomain(&ms[i])
	}
	return users, nil
}

// Create inserts a new user record and writes the generated ID back to user.
func (r *GORMUserRepository) Create(ctx context.Context, user *domain.User) error {
	m := userDomainToModel(user)
	if err := r.db.WithContext(ctx).Create(m).Error; err != nil {
		return err
	}
	user.ID = m.ID
	return nil
}

// Save inserts or updates a user record (upsert).
func (r *GORMUserRepository) Save(ctx context.Context, user *domain.User) error {
	if user.ID != 0 {
		return r.Update(ctx, user, nil)
	}
	return r.Create(ctx, user)
}

// Update applies a partial update on the user identified by user.ID + user.TenantID.
func (r *GORMUserRepository) Update(ctx context.Context, user *domain.User, fields map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ? AND \"tenantId\" = ?", user.ID, user.TenantID).
		Updates(fields).Error
}

// Delete soft-deletes the user with the given id under tenantID.
func (r *GORMUserRepository) Delete(ctx context.Context, id int, tenantID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		Delete(&models.User{}).Error
}

// --- Mapping helpers ---

func userModelToDomain(m *models.User) *domain.User {
	return &domain.User{
		ID:           m.ID,
		Name:         m.Name,
		Email:        m.Email,
		PasswordHash: m.PasswordHash,
		TokenVersion: m.TokenVersion,
		WhatsappID:   m.WhatsappID,
		TenantID:     m.TenantID,
		CargoID:      m.CargoID,
		Alcance:      m.Alcance,
		Configs:      m.Configs,
		CreatedAt:    m.CreatedAt,
		UpdatedAt:    m.UpdatedAt,
	}
}

func userDomainToModel(d *domain.User) *models.User {
	return &models.User{
		ID:           d.ID,
		Name:         d.Name,
		Email:        d.Email,
		PasswordHash: d.PasswordHash,
		TokenVersion: d.TokenVersion,
		WhatsappID:   d.WhatsappID,
		TenantID:     d.TenantID,
		CargoID:      d.CargoID,
		Alcance:      d.Alcance,
		Configs:      d.Configs,
		CreatedAt:    d.CreatedAt,
		UpdatedAt:    d.UpdatedAt,
	}
}
