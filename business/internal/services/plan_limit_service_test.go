package services

import (
	"testing"

	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// --- Test helpers ---

func setupPlanLimitDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}

	// Use test structs without gen_random_uuid()
	type PlanTest struct {
		ID             int    `gorm:"primaryKey"`
		Name           string `gorm:"unique;not null"`
		UsersLimit     int    `gorm:"column:usersLimit;default:0"`
		ConnectionsLimit int  `gorm:"column:connectionsLimit;default:0"`
		QueuesLimit    int    `gorm:"column:queuesLimit;default:0"`
		PluginQuota   int    `gorm:"column:pluginQuota;default:0"`
		Price         float64 `gorm:"type:decimal(10,2)"`
		Active        bool    `gorm:"default:true"`
	}

	type TenantSubscriptionTest struct {
		ID       uuid.UUID `gorm:"type:uuid;primaryKey"`
		TenantID uuid.UUID `gorm:"column:tenantId;type:uuid;not null"`
		PlanID   int       `gorm:"column:planId;not null"`
		Status   string    `gorm:"default:'active'"`
	}

	type PluginInstallationTest struct {
		ID       uuid.UUID `gorm:"type:uuid;primaryKey"`
		TenantID uuid.UUID `gorm:"column:tenantId;type:uuid;not null"`
		PluginID string    `gorm:"column:pluginId"`
		Active   bool      `gorm:"default:true"`
	}

	_ = PlanTest{}
	_ = TenantSubscriptionTest{}
	_ = PluginInstallationTest{}

	statements := []string{
		`CREATE TABLE Plans (id INTEGER PRIMARY KEY, name TEXT, usersLimit INTEGER, connectionsLimit INTEGER, queuesLimit INTEGER, pluginQuota INTEGER, price REAL, active BOOLEAN);`,
		`CREATE TABLE TenantSubscriptions (id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, planId INTEGER NOT NULL, status TEXT);`,
		`CREATE TABLE PluginInstallations (id TEXT PRIMARY KEY, tenantId TEXT NOT NULL, pluginId TEXT, active BOOLEAN);`,
	}
	for _, stmt := range statements {
		if err := db.Exec(stmt).Error; err != nil {
			t.Fatalf("failed to create test table: %v", err)
		}
	}

	return db
}

func seedPlanLimitData(db *gorm.DB, tenantID uuid.UUID, pluginQuota int, pluginCount int) {
	// Create plan
	plan := map[string]interface{}{
		"id":          1,
		"name":        "Pro",
		"pluginQuota": pluginQuota,
		"active":      true,
	}
	db.Table("Plans").Create(&plan)

	// Create subscription
	subID := uuid.New()
	sub := map[string]interface{}{
		"id":        subID.String(),
		"tenantId":  tenantID.String(),
		"planId":    1,
		"status":    "active",
	}
	db.Table("TenantSubscriptions").Create(&sub)

	// Create plugin installations
	for i := 0; i < pluginCount; i++ {
		pi := map[string]interface{}{
			"id":        uuid.New().String(),
			"tenantId":  tenantID.String(),
			"pluginId":  uuid.New().String(),
			"active":    true,
		}
		db.Table("PluginInstallations").Create(&pi)
	}
}

// --- Tests ---

func TestPlanLimitService_FreeResources_AlwaysAllowed(t *testing.T) {
	db := setupPlanLimitDB(t)
	svc := NewPlanLimitService(db)
	tenantID := uuid.New()

	// users, connections, queues are free/unlimited — no subscription needed
	for _, resource := range []string{"users", "connections", "queues"} {
		if err := svc.CheckLimit(tenantID, resource); err != nil {
			t.Errorf("CheckLimit(%q) should be free, got error: %v", resource, err)
		}
	}
}

func TestPlanLimitService_Plugins_NoSubscription_Rejected(t *testing.T) {
	db := setupPlanLimitDB(t)
	svc := NewPlanLimitService(db)
	tenantID := uuid.New()

	err := svc.CheckLimit(tenantID, "plugins")
	if err == nil {
		t.Fatal("expected error when no active subscription exists")
	}
	if err.Error() != "active subscription required for plugin features" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestPlanLimitService_Plugins_WithinQuota_Allowed(t *testing.T) {
	db := setupPlanLimitDB(t)
	svc := NewPlanLimitService(db)
	tenantID := uuid.New()

	// Plan allows 5 plugins, tenant has 3 installed
	seedPlanLimitData(db, tenantID, 5, 3)

	if err := svc.CheckLimit(tenantID, "plugins"); err != nil {
		t.Errorf("expected plugin check to pass (3/5), got: %v", err)
	}
}

func TestPlanLimitService_Plugins_QuotaExceeded_Rejected(t *testing.T) {
	db := setupPlanLimitDB(t)
	svc := NewPlanLimitService(db)
	tenantID := uuid.New()

	// Plan allows 3 plugins, tenant already has 3 installed
	seedPlanLimitData(db, tenantID, 3, 3)

	err := svc.CheckLimit(tenantID, "plugins")
	if err == nil {
		t.Fatal("expected quota exceeded error")
	}
}

func TestPlanLimitService_Plugins_ZeroQuota_Unlimited(t *testing.T) {
	db := setupPlanLimitDB(t)
	svc := NewPlanLimitService(db)
	tenantID := uuid.New()

	// PluginQuota=0 means unlimited per Plan model logic
	seedPlanLimitData(db, tenantID, 0, 10)

	if err := svc.CheckLimit(tenantID, "plugins"); err != nil {
		t.Errorf("quota=0 means unlimited, got: %v", err)
	}
}

func TestPlanLimitService_Plugins_CrossTenant_Isolation(t *testing.T) {
	db := setupPlanLimitDB(t)
	svc := NewPlanLimitService(db)

	tenantA := uuid.New()
	tenantB := uuid.New()

	// Tenant A: quota=2, 2 plugins installed (at limit)
	seedPlanLimitData(db, tenantA, 2, 2)

	// Tenant B: quota=5, 1 plugin installed
	seedPlanLimitData(db, tenantB, 5, 1)

	// Tenant A should be blocked
	if err := svc.CheckLimit(tenantA, "plugins"); err == nil {
		t.Error("tenant A should hit quota limit")
	}

	// Tenant B should be allowed
	if err := svc.CheckLimit(tenantB, "plugins"); err != nil {
		t.Errorf("tenant B should pass (1/5), got: %v", err)
	}
}

func TestPlanLimitService_UnknownResource_RequiresSubscription(t *testing.T) {
	db := setupPlanLimitDB(t)
	svc := NewPlanLimitService(db)
	tenantID := uuid.New()

	// Any non-free resource without subscription should fail
	err := svc.CheckLimit(tenantID, "premium_feature")
	if err == nil {
		t.Fatal("unknown resource without subscription should be rejected")
	}
}

func TestPlanLimitService_UnknownResource_WithSubscription_Allowed(t *testing.T) {
	db := setupPlanLimitDB(t)
	svc := NewPlanLimitService(db)
	tenantID := uuid.New()

	// Has subscription but unknown resource falls through switch → nil
	seedPlanLimitData(db, tenantID, 5, 0)

	if err := svc.CheckLimit(tenantID, "premium_feature"); err != nil {
		t.Errorf("unknown resource with subscription should pass, got: %v", err)
	}
}
