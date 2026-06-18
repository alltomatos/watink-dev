package testutil

import (
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewTestDB creates an isolated PostgreSQL schema for one test and returns a *gorm.DB scoped to it.
// All production models are auto-migrated. The schema is dropped via t.Cleanup.
func NewTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := testDSN()
	cfg := &gorm.Config{
		Logger:                                   logger.Discard,
		DisableForeignKeyConstraintWhenMigrating: true,
	}

	// Root connection — used only to create/drop the schema.
	root, err := gorm.Open(postgres.Open(dsn), cfg)
	if err != nil {
		t.Fatalf("testutil.NewTestDB: connect: %v", err)
	}
	defer func() {
		if sqlDB, err := root.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}()

	schema := "test_" + strings.ReplaceAll(uuid.New().String(), "-", "")[:12]

	if err := root.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("testutil.NewTestDB: create schema %q: %v", schema, err)
	}

	// Test connection — single connection so SET search_path persists.
	db, err := gorm.Open(postgres.Open(dsn), cfg)
	if err != nil {
		t.Fatalf("testutil.NewTestDB: connect for schema: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("testutil.NewTestDB: get sql.DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)

	if err := db.Exec("SET search_path TO " + schema).Error; err != nil {
		t.Fatalf("testutil.NewTestDB: SET search_path: %v", err)
	}

	if err := db.AutoMigrate(allModels()...); err != nil {
		t.Fatalf("testutil.NewTestDB: AutoMigrate: %v", err)
	}

	t.Cleanup(func() {
		_ = sqlDB.Close()

		clean, _ := gorm.Open(postgres.Open(dsn), cfg)
		clean.Exec("DROP SCHEMA " + schema + " CASCADE")
		if cleanSQL, err := clean.DB(); err == nil {
			_ = cleanSQL.Close()
		}
	})

	return db
}

func testDSN() string {
	if dsn := os.Getenv("TEST_DATABASE_URL"); dsn != "" {
		return dsn
	}
	host := envOr("DB_HOST", "localhost")
	port := envOr("DB_PORT", "5432")
	user := envOr("DB_USER", "postgres")
	pass := envOr("DB_PASS", "postgres")
	name := envOr("DB_NAME", "watink")
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, pass, host, port, name)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func allModels() []interface{} {
	return []interface{}{
		&models.Plan{},
		&models.Tenant{},
		&models.TenantSubscription{},
		&models.User{},
		&models.Setting{},
		&models.Contact{},
		&models.Whatsapp{},
		&models.Queue{},
		&models.Ticket{},
		&models.Message{},
		&models.Group{},
		&models.Permission{},
		&models.Role{},
		&models.RolePermission{},
		&models.Flow{},
		&models.QuickAnswer{},
		&models.KnowledgeBase{},
		&models.KnowledgeBaseSource{},
		&models.Pipeline{},
		&models.PipelineStage{},
		&models.TagGroup{},
		&models.Tag{},
		&models.EntityTag{},
		&models.TicketLog{},
		&models.ConversationEmbedding{},
	}
}
