package services

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTicketLogDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(t.TempDir()+"/ticketlog_test.db"), &gorm.Config{})
	require.NoError(t, err)
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	ddls := []string{
		`CREATE TABLE IF NOT EXISTS "Tickets" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"status" TEXT NOT NULL DEFAULT 'pending',
			"tenantId" TEXT NOT NULL,
			"contactId" INTEGER,
			"userId" INTEGER,
			"queueId" INTEGER,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "TicketLogs" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"ticketId" INTEGER NOT NULL,
			"userId" INTEGER,
			"type" TEXT NOT NULL,
			"payload" TEXT,
			"tenantId" TEXT NOT NULL,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
	}
	for _, ddl := range ddls {
		db.Exec(ddl)
	}

	return db
}

func TestTicketLogService_CreateLog_Success(t *testing.T) {
	db := setupTicketLogDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantID)
	var ticketID int
	db.Raw(`SELECT id FROM "Tickets" LIMIT 1`).Scan(&ticketID)

	svc := NewTicketLogService(db)
	userID := 42
	svc.CreateTicketLog(ticketID, tenantID, &userID, "transfer", map[string]interface{}{"from": "queue1", "to": "queue2"})

	var count int64
	db.Raw(`SELECT COUNT(*) FROM "TicketLogs" WHERE "ticketId" = ? AND type = ?`, ticketID, "transfer").Scan(&count)
	assert.Equal(t, int64(1), count, "deve criar um TicketLog do tipo transfer")
}

func TestTicketLogService_CreateLog_TicketNotFound_NoLog(t *testing.T) {
	db := setupTicketLogDB(t)
	tenantID := uuid.New()

	svc := NewTicketLogService(db)
	svc.CreateTicketLog(9999, tenantID, nil, "close", nil)

	var count int64
	db.Raw(`SELECT COUNT(*) FROM "TicketLogs"`).Scan(&count)
	assert.Equal(t, int64(0), count, "ticket inexistente não deve criar TicketLog")
}

func TestTicketLogService_CreateLog_CrossTenantBlocked(t *testing.T) {
	db := setupTicketLogDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantA)
	var ticketID int
	db.Raw(`SELECT id FROM "Tickets" LIMIT 1`).Scan(&ticketID)

	svc := NewTicketLogService(db)
	// tenant B tentando criar log para ticket do tenant A
	svc.CreateTicketLog(ticketID, tenantB, nil, "close", nil)

	var count int64
	db.Raw(`SELECT COUNT(*) FROM "TicketLogs"`).Scan(&count)
	assert.Equal(t, int64(0), count, "tenant B não pode criar log para ticket de tenant A")
}

func TestTicketLogService_CreateLog_NilPayload(t *testing.T) {
	db := setupTicketLogDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantID)
	var ticketID int
	db.Raw(`SELECT id FROM "Tickets" LIMIT 1`).Scan(&ticketID)

	svc := NewTicketLogService(db)
	svc.CreateTicketLog(ticketID, tenantID, nil, "open", nil)

	var payload string
	db.Raw(`SELECT payload FROM "TicketLogs" WHERE "ticketId" = ?`, ticketID).Scan(&payload)
	assert.Equal(t, "", payload, "payload nil deve salvar string vazia")
}
