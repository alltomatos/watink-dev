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
	CreatedAt time.Time `gorm:"column:createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt"`
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
		Alcance:      "tenant",
		TenantID:     tenantA,
	}
	userB = &models.User{
		Name:         "Bob B",
		Email:        "bob@tenant-b.com",
		PasswordHash: "$2a$10$hash_bob",
		Alcance:      "proprio",
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

// TestGORMUserRepo_FindByEmailForAuth_ReturnsCargoPermissions verifica que o login
// devolve as permissões EFETIVAS do usuário (vindas do Cargo) — sem isso o frontend
// Can (perform="flows:read") nunca libera o item do FlowBuilder para quem não tem
// alcance tenant/plataforma (ADR 0022).
func TestGORMUserRepo_FindByEmailForAuth_ReturnsCargoPermissions(t *testing.T) {
	db := setupUserTestDB(t)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	tenantID := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantID, Name: "T"}).Error)

	perm := models.Permission{Resource: "flows", Action: "read"}
	require.NoError(t, db.Create(&perm).Error)

	cargo := models.Cargo{Name: "Atendente", TenantID: tenantID}
	require.NoError(t, db.Create(&cargo).Error)
	require.NoError(t, db.Create(&models.CargoPermissao{CargoID: cargo.ID, PermissionID: perm.ID}).Error)

	// Alcance "proprio" de propósito: força o caminho de permissão via Cargo
	// (não o bypass de alcance tenant/plataforma).
	user := &models.User{
		Name:         "Carol",
		Email:        "carol@tenant.com",
		PasswordHash: "$2a$10$hash_carol",
		Alcance:      "proprio",
		TenantID:     tenantID,
		CargoID:      &cargo.ID,
	}
	require.NoError(t, db.Create(user).Error)

	got, err := repo.FindByEmailForAuth(ctx, "carol@tenant.com")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Contains(t, got.Permissions, "flows:read",
		"login deve retornar as permissões efetivas do Cargo (flows:read) para o Can liberar o item")
}

// ── GAP-2a: effectivePermissionNames — pacote de Gestor ─────────────────────

// TestGORMUserRepo_EffectivePermissions_SimpleCargo_NoGestor verifica o caso
// (a): usuário com Cargo simples, sem marca de gestor em nenhum Setor — só as
// permissions do próprio Cargo, nada extra.
func TestGORMUserRepo_EffectivePermissions_SimpleCargo_NoGestor(t *testing.T) {
	db := setupUserTestDB(t)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	tenantID := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantID, Name: "T"}).Error)

	permRead := models.Permission{Resource: "tickets", Action: "read"}
	permReassign := models.Permission{Resource: "tickets", Action: "reassign"}
	require.NoError(t, db.Create(&permRead).Error)
	require.NoError(t, db.Create(&permReassign).Error)

	atendente := models.Cargo{Name: "Atendente", TenantID: tenantID}
	require.NoError(t, db.Create(&atendente).Error)
	require.NoError(t, db.Create(&models.CargoPermissao{CargoID: atendente.ID, PermissionID: permRead.ID}).Error)

	// Cargo "Gestor" existe no tenant, mas o usuário não é gestor de setor
	// nenhum — não deve ganhar tickets:reassign.
	gestorCargo := models.Cargo{Name: "Gestor", TenantID: tenantID}
	require.NoError(t, db.Create(&gestorCargo).Error)
	require.NoError(t, db.Create(&models.CargoPermissao{CargoID: gestorCargo.ID, PermissionID: permReassign.ID}).Error)

	user := &models.User{
		Name: "Dave", Email: "dave@tenant.com", PasswordHash: "$2a$10$hash",
		Alcance: "proprio", TenantID: tenantID, CargoID: &atendente.ID,
	}
	require.NoError(t, db.Create(user).Error)

	got, err := repo.FindByEmailForAuth(ctx, "dave@tenant.com")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Contains(t, got.Permissions, "tickets:read")
	assert.NotContains(t, got.Permissions, "tickets:reassign",
		"usuário não-gestor não deve ganhar o pacote de Gestor")
}

// TestGORMUserRepo_EffectivePermissions_GestorDeSetor_SomaPacote verifica o
// caso (b): usuário marcado ehGestor=true num Setor, com Cargo "Gestor"
// existente no tenant — deve somar permissions do Cargo base + do Cargo
// Gestor, sem duplicar.
func TestGORMUserRepo_EffectivePermissions_GestorDeSetor_SomaPacote(t *testing.T) {
	db := setupUserTestDB(t)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	tenantID := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantID, Name: "T"}).Error)

	permRead := models.Permission{Resource: "tickets", Action: "read"}
	permReassign := models.Permission{Resource: "tickets", Action: "reassign"}
	permClose := models.Permission{Resource: "tickets", Action: "close"}
	require.NoError(t, db.Create(&permRead).Error)
	require.NoError(t, db.Create(&permReassign).Error)
	require.NoError(t, db.Create(&permClose).Error)

	// Cargo base do usuário é "Atendente" (não "Gestor") — o ganho de poderes
	// vem da marca ehGestor, não do nome do Cargo base.
	atendente := models.Cargo{Name: "Atendente", TenantID: tenantID}
	require.NoError(t, db.Create(&atendente).Error)
	require.NoError(t, db.Create(&models.CargoPermissao{CargoID: atendente.ID, PermissionID: permRead.ID}).Error)

	gestorCargo := models.Cargo{Name: "Gestor", TenantID: tenantID}
	require.NoError(t, db.Create(&gestorCargo).Error)
	require.NoError(t, db.Create(&models.CargoPermissao{CargoID: gestorCargo.ID, PermissionID: permReassign.ID}).Error)
	// Overlap proposital com permRead do Cargo base — dedup não deve duplicar.
	require.NoError(t, db.Create(&models.CargoPermissao{CargoID: gestorCargo.ID, PermissionID: permRead.ID}).Error)
	require.NoError(t, db.Create(&models.CargoPermissao{CargoID: gestorCargo.ID, PermissionID: permClose.ID}).Error)

	setor := models.Setor{Name: "Vendas", TenantID: tenantID}
	require.NoError(t, db.Create(&setor).Error)

	user := &models.User{
		Name: "Erin", Email: "erin@tenant.com", PasswordHash: "$2a$10$hash",
		Alcance: "setor", TenantID: tenantID, CargoID: &atendente.ID,
	}
	require.NoError(t, db.Create(user).Error)
	require.NoError(t, db.Create(&models.UserSetor{UserID: user.ID, SetorID: setor.ID, EhGestor: true}).Error)

	got, err := repo.FindByEmailForAuth(ctx, "erin@tenant.com")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Contains(t, got.Permissions, "tickets:read", "deve manter a permission do Cargo base")
	assert.Contains(t, got.Permissions, "tickets:reassign", "deve somar a permission exclusiva do pacote de Gestor")
	assert.Contains(t, got.Permissions, "tickets:close", "deve somar a permission exclusiva do pacote de Gestor")

	// Dedup: tickets:read aparece nos dois Cargos, mas só deve constar uma vez.
	count := 0
	for _, p := range got.Permissions {
		if p == "tickets:read" {
			count++
		}
	}
	assert.Equal(t, 1, count, "tickets:read não deve duplicar mesmo vindo de dois Cargos")
}

// TestGORMUserRepo_EffectivePermissions_GestorSemCargoGestorNoTenant verifica
// o caso (c): usuário marcado ehGestor=true, mas o tenant NÃO tem um Cargo
// chamado "Gestor" — não deve quebrar, apenas não somar nada extra.
func TestGORMUserRepo_EffectivePermissions_GestorSemCargoGestorNoTenant(t *testing.T) {
	db := setupUserTestDB(t)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	tenantID := uuid.New()
	require.NoError(t, db.Create(&TenantTest{ID: tenantID, Name: "T"}).Error)

	permRead := models.Permission{Resource: "tickets", Action: "read"}
	require.NoError(t, db.Create(&permRead).Error)

	// Tenant customizado: nenhum Cargo chamado literalmente "Gestor" existe.
	atendente := models.Cargo{Name: "Suporte Nível 1", TenantID: tenantID}
	require.NoError(t, db.Create(&atendente).Error)
	require.NoError(t, db.Create(&models.CargoPermissao{CargoID: atendente.ID, PermissionID: permRead.ID}).Error)

	setor := models.Setor{Name: "Suporte", TenantID: tenantID}
	require.NoError(t, db.Create(&setor).Error)

	user := &models.User{
		Name: "Frank", Email: "frank@tenant.com", PasswordHash: "$2a$10$hash",
		Alcance: "setor", TenantID: tenantID, CargoID: &atendente.ID,
	}
	require.NoError(t, db.Create(user).Error)
	require.NoError(t, db.Create(&models.UserSetor{UserID: user.ID, SetorID: setor.ID, EhGestor: true}).Error)

	got, err := repo.FindByEmailForAuth(ctx, "frank@tenant.com")
	require.NoError(t, err, "ausência de Cargo Gestor não deve gerar erro")
	require.NotNil(t, got)
	assert.Contains(t, got.Permissions, "tickets:read", "permission do Cargo base deve continuar presente")
	assert.Len(t, got.Permissions, 1, "sem Cargo Gestor no tenant, nada extra deve ser somado")
}
