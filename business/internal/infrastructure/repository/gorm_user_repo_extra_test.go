package repository

import (
	"context"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGORMUserRepo_Create_IDPropagated(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, _, _, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	user := &domain.User{
		Name:         "Carlos C",
		Email:        "carlos@tenant-a.com",
		PasswordHash: "$2a$10$hash_carlos",
		Profile:      "agent",
		TenantID:     tenantA,
		Configs:      "{}",
	}
	err := repo.Create(ctx, user)
	require.NoError(t, err)
	assert.Greater(t, user.ID, 0, "ID deve ser propagado de volta para o domínio após Create")
}

func TestGORMUserRepo_Save_CreatePath(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, _, _, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	user := &domain.User{
		Name:         "Diana D",
		Email:        "diana@tenant-a.com",
		PasswordHash: "$2a$10$hash_diana",
		Profile:      "agent",
		TenantID:     tenantA,
		Configs:      "{}",
	}
	// ID=0 → deve chamar Create
	err := repo.Save(ctx, user)
	require.NoError(t, err)
	assert.Greater(t, user.ID, 0, "Save com ID=0 deve criar usuário e propagar ID")
}

func TestGORMUserRepo_Save_UpdatePath(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, _, userA, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	domainUser := &domain.User{
		ID:       userA.ID,
		Name:     "Alice Updated via Save",
		TenantID: tenantA,
		Configs:  "{}",
	}
	// ID != 0 → deve chamar Update (com fields=nil, não altera nada no DB via Updates vazio)
	err := repo.Save(ctx, domainUser)
	// Updates com map nil não altera nenhum campo — apenas verifica que não há erro
	assert.NoError(t, err)
}

func TestGORMUserRepo_FindByIDDetail_Found(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, _, userA, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	found, err := repo.FindByIDDetail(ctx, userA.ID, tenantA)
	require.NoError(t, err)
	assert.NotNil(t, found, "FindByIDDetail deveria encontrar o usuário")
	assert.Equal(t, "Alice A", found.Name)
}

func TestGORMUserRepo_FindByIDDetail_NotFound(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, _, _, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	found, err := repo.FindByIDDetail(ctx, 99999, tenantA)
	assert.NoError(t, err)
	assert.Nil(t, found, "FindByIDDetail com ID inexistente deve retornar nil")
}

func TestGORMUserRepo_FindByEmail_NotFound(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, _, _, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	found, err := repo.FindByEmail(ctx, "naoexiste@tenant-a.com", tenantA)
	assert.NoError(t, err)
	assert.Nil(t, found)
}

func TestGORMUserRepo_FindByID_NotFound(t *testing.T) {
	db := setupUserTestDB(t)
	tenantA, _, _, _ := seedTwoTenantsUsers(t, db)
	repo := NewGORMUserRepo(db)
	ctx := context.Background()

	found, err := repo.FindByID(ctx, 99999, tenantA)
	assert.NoError(t, err)
	assert.Nil(t, found)
}
