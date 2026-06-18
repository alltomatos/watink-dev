package services

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var setupTestDBCounter int

func newSetupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	// DB isolado por teste — cada teste recebe arquivo SQLite único em memória
	setupTestDBCounter++
	dsn := fmt.Sprintf("file:setup_test_%d?mode=memory&cache=shared", setupTestDBCounter)
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}

	ddl := []string{
		`CREATE TABLE IF NOT EXISTS Plans (id integer primary key autoincrement, name text not null unique, usersLimit integer default 0, connectionsLimit integer default 0, queuesLimit integer default 0, pluginQuota integer default 0, price decimal(10,2), active boolean default true, createdAt datetime, updatedAt datetime);`,
		`CREATE TABLE IF NOT EXISTS Tenants (id text primary key, name text not null, status text default 'active', ownerId integer, document text, createdAt datetime, updatedAt datetime);`,
		`CREATE TABLE IF NOT EXISTS Groups (id integer primary key autoincrement, name text not null, tenantId text not null, createdAt datetime, updatedAt datetime);`,
		`CREATE TABLE IF NOT EXISTS Permissions (id integer primary key autoincrement, resource text not null, action text not null, description text, isSystem boolean default true, createdAt datetime, updatedAt datetime);`,
		`CREATE TABLE IF NOT EXISTS group_permissions (group_id integer not null, permission_id integer not null);`,
		`CREATE TABLE IF NOT EXISTS Users (id integer primary key autoincrement, name text not null, email text not null unique, passwordHash text not null, tokenVersion integer default 0, profile text default 'admin', whatsappId integer, tenantId text not null, groupId integer, configs text, createdAt datetime, updatedAt datetime);`,
		`CREATE TABLE IF NOT EXISTS Queues (id integer primary key autoincrement, name text not null, color text not null, greetingMessage text, distributionStrategy text default 'MANUAL', prioritizeWallet boolean default false, parentId integer, tenantId text not null, createdAt datetime, updatedAt datetime);`,
		`CREATE TABLE IF NOT EXISTS Tags (id integer primary key autoincrement, name text not null, color text default 'blue', icon text, description text, archived boolean default false, groupId integer, tenantId text not null, createdAt datetime, updatedAt datetime);`,
		`CREATE TABLE IF NOT EXISTS Settings (key text not null, value text, tenantId text not null, createdAt datetime, updatedAt datetime, primary key (key, tenantId));`,
		`CREATE TABLE IF NOT EXISTS TenantSubscriptions (id text primary key, tenantId text not null, planId integer not null, status text default 'active', expiresAt datetime, createdAt datetime, updatedAt datetime);`,
	}

	for _, stmt := range ddl {
		if err := db.Exec(stmt).Error; err != nil {
			t.Fatalf("create test schema: %v", err)
		}
	}

	return db
}

func seedPermissions(t *testing.T, db *gorm.DB) {
	t.Helper()
	perms := []models.Permission{
		{Resource: "tickets", Action: "read", IsSystem: true},
		{Resource: "settings", Action: "update", IsSystem: true},
	}
	if err := db.Create(&perms).Error; err != nil {
		t.Fatalf("seed permissions: %v", err)
	}
}

func TestSetupServiceInitializeTenantCreatesAtomicDayZeroWorkspace(t *testing.T) {
	db := newSetupTestDB(t)
	seedPermissions(t, db)

	svc := NewSetupService(db)
	err := svc.InitializeTenant(TenantSeedData{
		FirstName:  "Maria",
		LastName:   "Silva",
		Email:      "maria@example.com",
		Password:   "secret123",
		Document:   "12345678000199",
		BackendURL: "https://api.example.com",
	})
	if err != nil {
		t.Fatalf("InitializeTenant: %v", err)
	}

	// Tenant
	var tenant models.Tenant
	if err := db.First(&tenant).Error; err != nil {
		t.Fatalf("tenant not created: %v", err)
	}
	if tenant.ID == uuid.Nil {
		t.Fatal("tenant ID must not be zero")
	}
	if tenant.Name != "Maria's Workspace" {
		t.Fatalf("tenant name: got %q, want %q", tenant.Name, "Maria's Workspace")
	}
	if tenant.Status != "active" || tenant.Document != "12345678000199" {
		t.Fatalf("tenant unexpected: %+v", tenant)
	}

	// Subscription
	var sub models.TenantSubscription
	if err := db.First(&sub, "tenantId = ?", tenant.ID).Error; err != nil {
		t.Fatalf("subscription not created: %v", err)
	}
	if sub.Status != "active" {
		t.Fatalf("subscription status: got %q", sub.Status)
	}

	// User
	var user models.User
	if err := db.First(&user, "email = ?", "maria@example.com").Error; err != nil {
		t.Fatalf("user not created: %v", err)
	}
	if user.TenantID != tenant.ID {
		t.Fatalf("user tenantId mismatch: got %s, want %s", user.TenantID, tenant.ID)
	}
	if user.Profile != "superadmin" {
		t.Fatalf("user profile: got %q, want superadmin", user.Profile)
	}
	if user.GroupID == nil {
		t.Fatal("user groupId must not be nil")
	}
	if !user.CheckPassword("secret123") {
		t.Fatal("user password check failed")
	}

	// Owner
	if tenant.OwnerID == nil || *tenant.OwnerID != user.ID {
		t.Fatalf("tenant ownerId not set correctly: got %v, want %d", tenant.OwnerID, user.ID)
	}

	// Group permissions
	var assigned int64
	if err := db.Table("group_permissions").Where("group_id = ?", *user.GroupID).Count(&assigned).Error; err != nil {
		t.Fatalf("count group permissions: %v", err)
	}
	if assigned != 2 {
		t.Fatalf("expected 2 group permissions, got %d", assigned)
	}

	// Queue
	var queue models.Queue
	if err := db.First(&queue, "tenantId = ? AND name = ?", tenant.ID, "Atendimento Inicial").Error; err != nil {
		t.Fatalf("default queue not created: %v", err)
	}
	if queue.Color == "" || queue.DistributionStrategy != "MANUAL" {
		t.Fatalf("unexpected queue: %+v", queue)
	}

	// Tag
	var tag models.Tag
	if err := db.First(&tag, "tenantId = ? AND name = ?", tenant.ID, "Novo Cliente").Error; err != nil {
		t.Fatalf("default tag not created: %v", err)
	}
	if tag.Color != "#28a745" {
		t.Fatalf("tag color: got %q, want #28a745", tag.Color)
	}

	// Settings
	var backend models.Setting
	if err := db.First(&backend, "tenantId = ? AND key = ?", tenant.ID, "backendUrl").Error; err != nil {
		t.Fatalf("backendUrl setting not created: %v", err)
	}
	if backend.Value != "https://api.example.com" {
		t.Fatalf("backendUrl value: got %q", backend.Value)
	}

	var sysTitle models.Setting
	if err := db.First(&sysTitle, "tenantId = ? AND key = ?", tenant.ID, "systemTitle").Error; err != nil {
		t.Fatalf("systemTitle setting not created: %v", err)
	}
	if sysTitle.Value != "Watink" {
		t.Fatalf("systemTitle value: got %q", sysTitle.Value)
	}
}

func TestSetupServiceInitializeTenantRollsBackOnFailure(t *testing.T) {
	db := newSetupTestDB(t)

	// Sabotage: drop Queues so transaction will fail at step 8
	if err := db.Exec(`DROP TABLE Queues`).Error; err != nil {
		t.Fatalf("drop queues: %v", err)
	}

	svc := NewSetupService(db)
	err := svc.InitializeTenant(TenantSeedData{
		FirstName: "Fail",
		Email:     "fail@example.com",
		Password:  "secret123",
	})
	if err == nil {
		t.Fatal("expected error from InitializeTenant")
	}

	// Verify full rollback: no orphans
	for _, table := range []string{"Tenants", "Users", "Groups", "Settings", "Tags"} {
		var count int64
		if err := db.Table(table).Count(&count).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			t.Fatalf("count %s: %v", table, err)
		}
		if count != 0 {
			t.Fatalf("expected rollback to leave %s empty, got %d rows", table, count)
		}
	}
}

func TestSetupService_NeedsSetup_True(t *testing.T) {
	db := newSetupTestDB(t)
	svc := NewSetupService(db)

	needs, err := svc.NeedsSetup(context.Background())
	if err != nil {
		t.Fatalf("NeedsSetup: %v", err)
	}
	if !needs {
		t.Fatal("expected NeedsSetup=true when DB is empty")
	}
}

func TestSetupService_NeedsSetup_False(t *testing.T) {
	db := newSetupTestDB(t)
	seedPermissions(t, db)

	svc := NewSetupService(db)
	if err := svc.InitializeTenant(TenantSeedData{
		FirstName: "Ana",
		Email:     "ana@example.com",
		Password:  "pass123",
	}); err != nil {
		t.Fatalf("InitializeTenant: %v", err)
	}

	needs, err := svc.NeedsSetup(context.Background())
	if err != nil {
		t.Fatalf("NeedsSetup: %v", err)
	}
	if needs {
		t.Fatal("expected NeedsSetup=false when tenant exists")
	}
}

func TestSetupServiceDoubleSetupPrevention(t *testing.T) {
	db := newSetupTestDB(t)
	seedPermissions(t, db)

	svc := NewSetupService(db)
	err := svc.InitializeTenant(TenantSeedData{
		FirstName: "First",
		Email:     "first@example.com",
		Password:  "secret123",
	})
	if err != nil {
		t.Fatalf("first setup: %v", err)
	}

	// Second setup with same email should fail (unique constraint)
	err = svc.InitializeTenant(TenantSeedData{
		FirstName: "Second",
		Email:     "first@example.com",
		Password:  "secret456",
	})
	if err == nil {
		t.Fatal("expected error on duplicate setup (unique email)")
	}
}
