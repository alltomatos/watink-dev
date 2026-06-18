package usecases

import (
	"context"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
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

func setupLogTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

// insertLogTicket inserts a ticket row using raw SQL so that the column name
// "tenantId" (camelCase, matching the production WHERE clause) is respected.
func insertLogTicket(t *testing.T, db *gorm.DB, tenantID uuid.UUID) int {
	t.Helper()
	var id int
	res := db.Raw(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?, ?) RETURNING id`, "open", tenantID.String()).Scan(&id)
	if res.Error != nil {
		t.Fatalf("insert ticket: %v", res.Error)
	}
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
