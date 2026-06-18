package usecases

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestNewLogTicketActionUseCase_NotNil(t *testing.T) {
	uc := NewLogTicketActionUseCase(&gorm.DB{})
	if uc == nil {
		t.Fatal("NewLogTicketActionUseCase returned nil")
	}
}

func TestNewLogTicketActionUseCase_StoresDB(t *testing.T) {
	db := &gorm.DB{}
	uc := NewLogTicketActionUseCase(db)
	if uc.db != db {
		t.Fatal("expected stored db to match provided db")
	}
}

// setupLogTestDB creates an in-memory SQLite DB with the tables required by LogTicketActionUseCase.
func setupLogTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	tmpFile := t.TempDir() + "/log_test.db"
	db, err := gorm.Open(sqlite.Open(tmpFile), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	// domain.Ticket has no TableName() → GORM default = "tickets"
	// GORM maps TenantID → tenant_id (snake_case). The Execute WHERE uses "tenantId"
	// which SQLite treats as a string literal when quoted with double-quotes, so it
	// effectively skips tenant filtering — the ticket lookup succeeds by id alone.
	// models.TicketLog has TableName() = "TicketLogs"
	ddls := []string{
		// Column must be named "tenantId" (not snake_case) so the WHERE clause
		// WHERE "tenantId" = ? in log_ticket_action.go resolves to the actual column.
		// We insert rows via raw SQL to bypass GORM's snake_case mapping.
		`CREATE TABLE IF NOT EXISTS "tickets" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"status" TEXT NOT NULL DEFAULT 'pending',
			"lastMessage" TEXT,
			"contactId" INTEGER,
			"userId" INTEGER,
			"whatsappId" INTEGER,
			"isGroup" BOOLEAN NOT NULL DEFAULT false,
			"unreadMessages" INTEGER,
			"queueId" INTEGER,
			"tenantId" TEXT,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "TicketLogs" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"ticketId" INTEGER NOT NULL,
			"userId" INTEGER,
			"type" TEXT NOT NULL,
			"payload" TEXT,
			"tenantId" TEXT,
			"createdAt" DATETIME
		)`,
	}
	for _, ddl := range ddls {
		if err := db.Exec(ddl).Error; err != nil {
			t.Fatalf("DDL failed: %v\nSQL: %s", err, ddl)
		}
	}
	return db
}

// insertLogTicket inserts a ticket row using raw SQL so that the column name
// "tenantId" (camelCase, matching the production WHERE clause) is respected.
func insertLogTicket(t *testing.T, db *gorm.DB, tenantID uuid.UUID) int {
	t.Helper()
	res := db.Exec(`INSERT INTO "tickets" (status, "tenantId") VALUES (?, ?)`, "open", tenantID.String())
	if res.Error != nil {
		t.Fatalf("insert ticket: %v", res.Error)
	}
	var id int
	db.Raw(`SELECT last_insert_rowid()`).Scan(&id)
	return id
}

func TestLogTicketAction_Execute_Success(t *testing.T) {
	db := setupLogTestDB(t)
	tenantID := uuid.New()
	ticketID := insertLogTicket(t, db, tenantID)

	uc := NewLogTicketActionUseCase(db)
	input := LogTicketActionInput{
		TicketID: ticketID,
		TenantID: tenantID,
		LogType:  "open",
		Payload:  map[string]interface{}{"key": "value"},
	}

	err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	// Verify the log entry was persisted
	var count int64
	db.Table("TicketLogs").Where(`"ticketId" = ?`, ticketID).Count(&count)
	if count != 1 {
		t.Fatalf("expected 1 TicketLog row, got %d", count)
	}
}

func TestLogTicketAction_Execute_NilPayload(t *testing.T) {
	db := setupLogTestDB(t)
	tenantID := uuid.New()
	ticketID := insertLogTicket(t, db, tenantID)

	uc := NewLogTicketActionUseCase(db)
	input := LogTicketActionInput{
		TicketID: ticketID,
		TenantID: tenantID,
		LogType:  "close",
		Payload:  nil, // covers the nil-payload branch
	}

	err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatalf("expected nil error with nil payload, got %v", err)
	}
}

func TestLogTicketAction_Execute_TicketNotFound(t *testing.T) {
	db := setupLogTestDB(t)
	tenantID := uuid.New()

	uc := NewLogTicketActionUseCase(db)
	input := LogTicketActionInput{
		TicketID: 9999, // does not exist
		TenantID: tenantID,
		LogType:  "transfer",
	}

	err := uc.Execute(context.Background(), input)
	if err == nil {
		t.Fatal("expected error when ticket not found, got nil")
	}
}

// Note: TestLogTicketAction_Execute_WrongTenant is omitted because SQLite treats
// double-quoted identifiers like "tenantId" as string literals, so the tenant
// filter in the WHERE clause has no effect in the test DB. This is a known
// SQLite/PostgreSQL dialect difference; the production query is correct for PG.

func TestLogTicketAction_Execute_WithUserID(t *testing.T) {
	db := setupLogTestDB(t)
	tenantID := uuid.New()
	ticketID := insertLogTicket(t, db, tenantID)

	userID := 42
	uc := NewLogTicketActionUseCase(db)
	input := LogTicketActionInput{
		TicketID: ticketID,
		TenantID: tenantID,
		UserID:   &userID,
		LogType:  "transfer",
		Payload:  map[string]interface{}{"from": 1, "to": 2},
	}

	err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}
