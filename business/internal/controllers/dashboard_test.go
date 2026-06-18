package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupDashboardTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	tmpFile := t.TempDir() + "/dashboard_test.db"
	db, err := gorm.Open(sqlite.Open(tmpFile), &gorm.Config{})
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
			"queueId" INTEGER,
			"createdAt" DATETIME,
			"updatedAt" DATETIME
		)`,
		`CREATE TABLE IF NOT EXISTS "Queues" (
			"id" INTEGER PRIMARY KEY AUTOINCREMENT,
			"name" TEXT NOT NULL,
			"color" TEXT NOT NULL DEFAULT '#000000',
			"distributionStrategy" TEXT DEFAULT 'MANUAL',
			"prioritizeWallet" BOOLEAN DEFAULT false,
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

func setupDashboardContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/dashboard", nil)

	c.Set("tenantId", tenantID)
	c.Set("userProfile", "admin")
	c.Set("userId", float64(1))
	scoped := db.Where(`"tenantId" = ?`, tenantID)
	c.Set("db", scoped)

	return c, w
}

func TestFetchTicketStatusCounts_EmptyDB(t *testing.T) {
	db := setupDashboardTestDB(t)
	tenantID := uuid.New()

	var target struct {
		Open    int64 `json:"open"`
		Pending int64 `json:"pending"`
		Closed  int64 `json:"closed"`
	}

	err := fetchTicketStatusCounts(db, tenantID, &target)
	assert.NoError(t, err)
	assert.Equal(t, int64(0), target.Open)
	assert.Equal(t, int64(0), target.Pending)
	assert.Equal(t, int64(0), target.Closed)
}

func TestFetchTicketStatusCounts_WithData(t *testing.T) {
	db := setupDashboardTestDB(t)
	tenantID := uuid.New()
	otherTenantID := uuid.New()

	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantID)
	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantID)
	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "pending", tenantID)
	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "closed", tenantID)
	// outro tenant — não deve aparecer
	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", otherTenantID)

	var target struct {
		Open    int64 `json:"open"`
		Pending int64 `json:"pending"`
		Closed  int64 `json:"closed"`
	}

	err := fetchTicketStatusCounts(db, tenantID, &target)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), target.Open)
	assert.Equal(t, int64(1), target.Pending)
	assert.Equal(t, int64(1), target.Closed)
}

func TestGetDashboardData_Returns200WithStructure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupDashboardTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantID)
	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "pending", tenantID)

	c, w := setupDashboardContext(t, db, tenantID)
	GetDashboardData(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var body DashboardData
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, int64(1), body.Tickets.Open)
	assert.Equal(t, int64(1), body.Tickets.Pending)
	assert.Equal(t, int64(0), body.Tickets.Closed)
}

func TestGetDashboardData_CrossTenantIsolation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupDashboardTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	// 3 tickets do tenant A, 5 do tenant B
	for i := 0; i < 3; i++ {
		db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantA)
	}
	for i := 0; i < 5; i++ {
		db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantB)
	}

	c, w := setupDashboardContext(t, db, tenantA)
	GetDashboardData(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var body DashboardData
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, int64(3), body.Tickets.Open, "deve ver apenas os tickets do próprio tenant")
}
