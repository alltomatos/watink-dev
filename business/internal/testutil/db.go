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
	cfg := &gorm.Config{Logger: logger.Discard}

	root, err := gorm.Open(postgres.Open(dsn), cfg)
	if err != nil {
		t.Fatalf("testutil.NewTestDB: connect: %v", err)
	}

	schema := "test_" + strings.ReplaceAll(uuid.New().String(), "-", "")[:12]

	if err := root.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("testutil.NewTestDB: create schema %q: %v", schema, err)
	}

	schemaDSN := appendSearchPath(dsn, schema)
	db, err := gorm.Open(postgres.Open(schemaDSN), cfg)
	if err != nil {
		t.Fatalf("testutil.NewTestDB: connect with schema: %v", err)
	}

	if err := db.AutoMigrate(allModels()...); err != nil {
		t.Fatalf("testutil.NewTestDB: AutoMigrate: %v", err)
	}

	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
		clean, _ := gorm.Open(postgres.Open(dsn), cfg)
		clean.Exec("DROP SCHEMA " + schema + " CASCADE")
		if sqlDB, err := clean.DB(); err == nil {
			sqlDB.Close()
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

func appendSearchPath(dsn, schema string) string {
	if strings.Contains(dsn, "?") {
		return dsn + "&search_path=" + schema
	}
	return dsn + "?search_path=" + schema
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
