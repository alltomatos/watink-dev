package database

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASS"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("Connected to database successfully")
}

func Migrate() {
	err := DB.AutoMigrate(
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
		&models.FlowRun{},
		&models.FlowRunLog{},
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
		&models.PollResult{},
		&models.Proxy{},
	)

	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	if err := applyRLS(); err != nil {
		log.Printf("Warning: failed to apply RLS policies: %v", err)
	}

	if err := addCustomIndexes(); err != nil {
		log.Printf("Warning: failed to create custom indexes: %v", err)
	}

	fmt.Println("Database migration completed")
	Seed()
}

func Seed() {
	// Seed Permissions
	permissions := []models.Permission{
		{Resource: "pipelines", Action: "view", Description: "Visualizar menu de Pipelines"},
		{Resource: "chats", Action: "view", Description: "Visualizar menu de Chats/Tickets"},
		{Resource: "admin", Action: "view", Description: "Visualizar menu de Administração"},
		{Resource: "queues", Action: "view", Description: "Gerenciar Filas (Admin)"},
		{Resource: "settings", Action: "view", Description: "Gerenciar Configurações (Admin)"},
		{Resource: "groups", Action: "view", Description: "Gerenciar Grupos de Usuários"},
		{Resource: "users", Action: "view", Description: "Gerenciar Usuários"},
		{Resource: "view", Action: "swagger", Description: "Visualizar documentação Swagger"},
		// FB0-B8: gate the FlowBuilder menu item (frontend Can perform="flows:read").
		{Resource: "flows", Action: "read", Description: "Visualizar/gerenciar Flows (Automação)"},
	}

	for _, p := range permissions {
		DB.FirstOrCreate(&p, models.Permission{Resource: p.Resource, Action: p.Action})
	}

	// FB0-B8 backfill: tenants created before flows:read existed don't have it
	// attached to their Admin group. Attach it idempotently so the FlowBuilder
	// sidebar item (frontend Can perform="flows:read") shows for ALL Admin-group
	// members on existing installs — not only superadmin/admin-profile users
	// (who bypass the check). Mirrors the proven group_permissions insert in
	// SetupService.InitializeTenant.
	var flowsPerm models.Permission
	if err := DB.Where("resource = ? AND action = ?", "flows", "read").First(&flowsPerm).Error; err == nil {
		if err := DB.Exec(`
			INSERT INTO group_permissions (group_id, permission_id)
			SELECT g.id, ?
			FROM "Groups" g
			WHERE g.name = 'Admin'
			  AND NOT EXISTS (
			    SELECT 1 FROM group_permissions gp
			    WHERE gp.group_id = g.id AND gp.permission_id = ?
			  )`, flowsPerm.ID, flowsPerm.ID).Error; err != nil {
			fmt.Printf("Seed: flows:read backfill skipped: %v\n", err)
		}
	}

	fmt.Println("Database seeding completed")
}

func addCustomIndexes() error {
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON "Tickets" ("tenantId", "status")`,
		`CREATE INDEX IF NOT EXISTS idx_tickets_tenant_queue_status ON "Tickets" ("tenantId", "queueId", "status")`,
		`CREATE INDEX IF NOT EXISTS idx_messages_tenant_ticket_fromme ON "Messages" ("tenantId", "ticketId", "fromMe")`,
		`CREATE INDEX IF NOT EXISTS idx_messages_tenant_fromme_createdat ON "Messages" ("tenantId", "fromMe", "createdAt")`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_quick_answers_tenant_shortcut ON "QuickAnswers" ("tenantId", shortcut)`,
		// FlowRun scheduler/cleanup read-paths: resume-due and expire-due sweeps
		// are tenant-scoped, status-filtered range scans on resumeAt/expiresAt.
		`CREATE INDEX IF NOT EXISTS idx_flow_runs_tenant_status_resumeat ON "FlowRuns" ("tenantId", "status", "resumeAt")`,
		`CREATE INDEX IF NOT EXISTS idx_flow_runs_tenant_status_expiresat ON "FlowRuns" ("tenantId", "status", "expiresAt")`,
		// Resume-first lookup: an inbound message resolves the active run for a
		// ticket via (tenantId, ticketId, status=waiting_*).
		`CREATE INDEX IF NOT EXISTS idx_flow_runs_tenant_ticket_status ON "FlowRuns" ("tenantId", "ticketId", "status")`,
		// Deal board render is tenant-scoped: kanban/funil lists by stage and the
		// ticket sidebar lists by ticket — both filter (tenantId, stageId|ticketId).
		`CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage ON "Deals" ("tenantId", "stageId")`,
		`CREATE INDEX IF NOT EXISTS idx_deals_tenant_ticket ON "Deals" ("tenantId", "ticketId")`,
		// KnowledgeBaseSources: the Show preload lists sources by knowledgeBaseId
		// and mutations/status updates scope by (tenantId, knowledgeBaseId).
		`CREATE INDEX IF NOT EXISTS idx_kb_sources_tenant_kb ON "KnowledgeBaseSources" ("tenantId", "knowledgeBaseId")`,
		// Proxy pool reads are tenant-scoped and filter by status (active pool,
		// isolated list) for assignment and the anti-ban isolation guard.
		`CREATE INDEX IF NOT EXISTS idx_proxies_tenant_status ON "Proxies" ("tenantId", "status")`,
	}

	for _, ddl := range indexes {
		if err := DB.Exec(ddl).Error; err != nil {
			return fmt.Errorf("create index: %w", err)
		}
	}
	return nil
}

func applyRLS() error {
	tables := []string{"Users", "Tickets", "Messages", "Contacts", "Settings", "ConversationEmbeddings", "FlowRuns", "FlowRunLogs"}

	for _, t := range tables {
		if err := DB.Exec(fmt.Sprintf("ALTER TABLE \"%s\" ENABLE ROW LEVEL SECURITY", t)).Error; err != nil {
			return fmt.Errorf("enable rls %s: %w", t, err)
		}
		if err := DB.Exec(fmt.Sprintf("ALTER TABLE \"%s\" FORCE ROW LEVEL SECURITY", t)).Error; err != nil {
			return fmt.Errorf("force rls %s: %w", t, err)
		}

		policy := fmt.Sprintf("%s_tenant_isolation", strings.ToLower(t))
		if err := DB.Exec(fmt.Sprintf("DROP POLICY IF EXISTS \"%s\" ON \"%s\"", policy, t)).Error; err != nil {
			return fmt.Errorf("drop policy %s: %w", t, err)
		}
		if err := DB.Exec(fmt.Sprintf(
			"CREATE POLICY \"%s\" ON \"%s\" USING ((\"tenantId\")::text = current_setting('app.current_tenant', true))",
			policy, t,
		)).Error; err != nil {
			return fmt.Errorf("policy %s: %w", t, err)
		}
	}

	return nil
}
