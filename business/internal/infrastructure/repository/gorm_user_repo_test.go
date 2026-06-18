package repository

import (
	"context"
	"testing"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// TenantTest redefine Tenant para uso em testes sem defaults de Postgres
// como gen_random_uuid(), que o SQLite in-memory não suporta.
type TenantTest struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Status    string    `gorm:"default:'active'" json:"status"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (TenantTest) TableName() string { return "Tenants" }

// setupUserTestDB cria um DB PostgreSQL isolado e retorna o *gorm.DB já migrado.
func setupUserTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

// seedTwoTenantsUsers cria 2 usuários em tenants diferentes e retorna os UUIDs.
func seedTwoTenantsUsers(t *testing.T, db *gorm.DB) (tenantA, tenantB uuid.UUID, userA, userB *models.User) {
	t.Helper()
	tenantA = uuid.New()
	tenantB = uuid.New()

	// Criar tenants usando struct compatível com SQLite.
	require.NoError(t, db.Create(&TenantTest{ID: tenantA, Name: "Tenant A"}).Error)
	require.NoError(t, db.Create(&TenantTest{ID: tenantB, Name: "Tenant B"}).Error)

	userA = &models.User{
		Name:         "Alice A",
		Email:        "alice@tenant-a.com",
		PasswordHash: "$2a$10$hash_alice",
		Profile:      "admin",
		TenantID:     tenantA,
	}
	userB = &models.User{
		Name:         "Bob B",
		Email:        "bob@tenant-b.com",
		PasswordHash: "$2a$10$hash_bob",
		Profile:      "agent",
		TenantID:     tenantB,
	}
	require.NoError(t, db.Create(userA).Error)
	require.NoError(t, db.Create(userB).Error)
	return
}

func TestGORMUserRepo_FindByID_TenantIsolation(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, tenantB, userA, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	// Buscar userA com tenantA → deve encontrar
	found, err := repo.FindByID(ctx, userA.ID, tenantA)
	assert.NoError(t, err)
	assert.NotNil(t, found, "deveria encontrar o usuário do próprio tenant")
	assert.Equal(t, "Alice A", found.Name)

	// Buscar userA com tenantB → deve retornar nil (isolamento)
	leaked, err := repo.FindByID(ctx, userA.ID, tenantB)
	assert.NoError(t, err)
	assert.Nil(t, leaked, "VAZAMENTO DE DADOS: encontrou usuário de outro tenant via FindByID")
}

func TestGORMUserRepo_FindAll_TenantIsolation(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, tenantB, _, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	// FindAll tenantA → só deve retornar Alice
	usersA, err := repo.FindAll(ctx, tenantA)
	assert.NoError(t, err)
	assert.Len(t, usersA, 1, "tenantA deveria ter exatamente 1 usuário")
	assert.Equal(t, "Alice A", usersA[0].Name)

	// FindAll tenantB → só deve retornar Bob
	usersB, err := repo.FindAll(ctx, tenantB)
	assert.NoError(t, err)
	assert.Len(t, usersB, 1, "tenantB deveria ter exatamente 1 usuário")
	assert.Equal(t, "Bob B", usersB[0].Name)
}

func TestGORMUserRepo_FindByEmail_TenantIsolation(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, tenantB, _, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	// Buscar email do tenantA com tenantA → deve encontrar
	found, err := repo.FindByEmail(ctx, "alice@tenant-a.com", tenantA)
	assert.NoError(t, err)
	assert.NotNil(t, found, "deveria encontrar o usuário pelo email no tenant correto")

	// Buscar email do tenantA com tenantB → deve retornar nil (isolamento)
	leaked, err := repo.FindByEmail(ctx, "alice@tenant-a.com", tenantB)
	assert.NoError(t, err)
	assert.Nil(t, leaked, "VAZAMENTO DE DADOS: encontrou usuário de outro tenant via FindByEmail")
}

func TestGORMUserRepo_Delete_TenantIsolation(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, tenantB, userA, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	// Tentar deletar userA usando tenantB → não deve afetar
	err := repo.Delete(ctx, userA.ID, tenantB)
	assert.NoError(t, err, "delete com tenant errado não deveria causar erro do GORM")

	// userA ainda deve existir para tenantA
	found, err := repo.FindByID(ctx, userA.ID, tenantA)
	assert.NoError(t, err)
	assert.NotNil(t, found, "delete com tenant errado não deveria ter removido o usuário")

	// Deletar com tenant correto
	err = repo.Delete(ctx, userA.ID, tenantA)
	assert.NoError(t, err)

	found, err = repo.FindByID(ctx, userA.ID, tenantA)
	assert.NoError(t, err)
	assert.Nil(t, found, "usuário deveria ter sido removido após delete com tenant correto")
}

func TestGORMUserRepo_Update_TenantIsolation(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, tenantB, userA, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	// Tentar update com tenant errado (tenantB tentando alterar userA)
	domainUser := &domain.User{
		ID:       userA.ID,
		TenantID: tenantB, // tenant errado
	}
	fields := map[string]interface{}{"name": "Hacked Name"}
	err := repo.Update(ctx, domainUser, fields)
	assert.NoError(t, err, "update com tenant errado não deve causar erro GORM, mas não deve afetar linhas")

	// userA não deve ter sido alterado
	found, err := repo.FindByID(ctx, userA.ID, tenantA)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, "Alice A", found.Name, "update com tenant errado não deveria alterar o nome")

	// Update com tenant correto
	domainUser.TenantID = tenantA
	err = repo.Update(ctx, domainUser, map[string]interface{}{"name": "Alice Updated"})
	assert.NoError(t, err)

	found, err = repo.FindByID(ctx, userA.ID, tenantA)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, "Alice Updated", found.Name, "update com tenant correto deveria alterar o nome")
}

func TestGORMUserRepo_FindByEmailForAuth_CrossTenant(t *testing.T) {
	db := setupUserTestDB(t)
	_, _, _, _ = seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	// FindByEmailForAuth é intencionalmente cross-tenant (usado no login)
	// Deve encontrar o usuário por email independentemente do tenant
	found, err := repo.FindByEmailForAuth(ctx, "alice@tenant-a.com")
	assert.NoError(t, err)
	assert.NotNil(t, found, "FindByEmailForAuth deveria encontrar o usuário para login")

	found2, err := repo.FindByEmailForAuth(ctx, "bob@tenant-b.com")
	assert.NoError(t, err)
	assert.NotNil(t, found2, "FindByEmailForAuth deveria encontrar o usuário para login")

	// Email inexistente → nil
	notFound, err := repo.FindByEmailForAuth(ctx, "nonexistent@email.com")
	assert.NoError(t, err)
	assert.Nil(t, notFound, "FindByEmailForAuth deveria retornar nil para email inexistente")
}
