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
	du.Permissions = r.effectivePermissionNames(ctx, m.ID, m.CargoID)
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
		perms, permErr := loadCargoPermissions(ctx, r.db, *m.CargoID)
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
	err := r.db.WithContext(ctx).
		Preload("Tenant").
		Where("email = ?", email).
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	du := userModelToDomain(&m)
	du.Permissions = r.effectivePermissionNames(ctx, m.ID, m.CargoID)
	return du, nil
}

// loadCargoPermissions loads a Cargo's Permissions via an explicit JOIN
// against cargo_permissoes (camelCase columns cargoId/permissionId). Not done
// via GORM's many2many Association()/Preload: that API resolves join-table
// column names independently of the explicit CargoPermissao struct and falls
// back to snake_case conventions, causing a runtime mismatch even though the
// table itself was created with the correct (camelCase) columns.
func loadCargoPermissions(ctx context.Context, db *gorm.DB, cargoID int) ([]models.Permission, error) {
	var perms []models.Permission
	err := db.WithContext(ctx).
		Table(`"Permissions"`).
		Joins(`JOIN cargo_permissoes ON cargo_permissoes."permissionId" = "Permissions".id`).
		Where(`cargo_permissoes."cargoId" = ?`, cargoID).
		Find(&perms).Error
	return perms, err
}

// effectivePermissionNames aggregates a user's EFFECTIVE permission names
// ("resource:action") from their Cargo's grants (cargo_permissoes — ADR 0022).
// Best-effort: a load error yields fewer names, never an auth failure.
//
// TODO(GAP-2a): somar pacote de Gestor via user_setores.ehGestor, escopado por
// Alcance (próprio|setor|tenant|plataforma) — ainda não implementado neste GAP.
func (r *GORMUserRepository) effectivePermissionNames(ctx context.Context, userID int, cargoID *int) []string {
	set := make(map[string]struct{})

	if cargoID != nil {
		if perms, err := loadCargoPermissions(ctx, r.db, *cargoID); err == nil {
			for i := range perms {
				set[perms[i].GetName()] = struct{}{}
			}
		}
	}

	names := make([]string, 0, len(set))
	for n := range set {
		names = append(names, n)
	}
	return names
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
