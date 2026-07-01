package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupDashboardTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func setupDashboardContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/dashboard", nil)

	c.Set("tenantId", tenantID)
	c.Set("alcance", "tenant")
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

func TestCalculateTMR_NoMessages_ReturnsZero(t *testing.T) {
	db := setupDashboardTestDB(t)
	tenantID := uuid.New()

	result := calculateTMR(tenantID, db)
	assert.Equal(t, float64(0), result)
}

func TestCalculateTMR_WithMessages_ReturnsAvgMinutes(t *testing.T) {
	db := setupDashboardTestDB(t)
	tenantID := uuid.New()

	// Ticket 1: contact message at T0, agent reply 10 minutes later
	t0 := time.Now().UTC().Truncate(time.Second)
	t1 := t0.Add(10 * time.Minute)
	db.Exec(`INSERT INTO "Tickets" (id, status, "tenantId") VALUES (?,?,?)`, 1, "open", tenantID)
	db.Exec(`INSERT INTO "Messages" (id, body, "ticketId", "fromMe", "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?)`,
		"msg-c1", "oi", 1, false, tenantID, t0, t0)
	db.Exec(`INSERT INTO "Messages" (id, body, "ticketId", "fromMe", "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?)`,
		"msg-a1", "resp", 1, true, tenantID, t1, t1)

	result := calculateTMR(tenantID, db)
	assert.InDelta(t, 10.0, result, 0.1, "TMR should be ~10 minutes")
}

func TestCalculateTMR_CrossTenantIsolation(t *testing.T) {
	db := setupDashboardTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	// Tenant A: 10 min response
	t0 := time.Now().UTC().Truncate(time.Second)
	db.Exec(`INSERT INTO "Tickets" (id, status, "tenantId") VALUES (?,?,?)`, 1, "open", tenantA)
	db.Exec(`INSERT INTO "Messages" (id, body, "ticketId", "fromMe", "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?)`,
		"a-c1", "oi", 1, false, tenantA, t0, t0)
	db.Exec(`INSERT INTO "Messages" (id, body, "ticketId", "fromMe", "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?)`,
		"a-a1", "resp", 1, true, tenantA, t0.Add(10*time.Minute), t0.Add(10*time.Minute))

	// Tenant B: different ticket and messages — must not bleed into tenant A
	db.Exec(`INSERT INTO "Tickets" (id, status, "tenantId") VALUES (?,?,?)`, 2, "open", tenantB)
	db.Exec(`INSERT INTO "Messages" (id, body, "ticketId", "fromMe", "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?)`,
		"b-c1", "oi", 2, false, tenantB, t0, t0)
	db.Exec(`INSERT INTO "Messages" (id, body, "ticketId", "fromMe", "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?)`,
		"b-a1", "resp", 2, true, tenantB, t0.Add(60*time.Minute), t0.Add(60*time.Minute))

	resultA := calculateTMR(tenantA, db)
	assert.InDelta(t, 10.0, resultA, 0.1, "tenant A TMR should be ~10 minutes")

	resultB := calculateTMR(tenantB, db)
	assert.InDelta(t, 60.0, resultB, 0.1, "tenant B TMR should be ~60 minutes")
}

func TestCalculateTME_NoTickets_ReturnsZero(t *testing.T) {
	db := setupDashboardTestDB(t)
	tenantID := uuid.New()

	result := calculateTME(tenantID, db)
	assert.Equal(t, float64(0), result)
}

func TestCalculateTME_WithData_ReturnsAvgMinutes(t *testing.T) {
	db := setupDashboardTestDB(t)
	tenantID := uuid.New()

	// Ticket created at T0, first agent reply 20 minutes later
	t0 := time.Now().UTC().Truncate(time.Second)
	t1 := t0.Add(20 * time.Minute)
	db.Exec(`INSERT INTO "Tickets" (id, status, "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?)`,
		1, "open", tenantID, t0, t0)
	db.Exec(`INSERT INTO "Messages" (id, body, "ticketId", "fromMe", "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?)`,
		"msg-a1", "resp", 1, true, tenantID, t1, t1)

	result := calculateTME(tenantID, db)
	assert.InDelta(t, 20.0, result, 0.1, "TME should be ~20 minutes")
}

func TestCalculateTME_MultipleTickets_ReturnsAverage(t *testing.T) {
	db := setupDashboardTestDB(t)
	tenantID := uuid.New()

	t0 := time.Now().UTC().Truncate(time.Second)

	// Ticket 1: 10 min wait
	db.Exec(`INSERT INTO "Tickets" (id, status, "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?)`,
		1, "open", tenantID, t0, t0)
	db.Exec(`INSERT INTO "Messages" (id, body, "ticketId", "fromMe", "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?)`,
		"msg-1", "resp", 1, true, tenantID, t0.Add(10*time.Minute), t0.Add(10*time.Minute))

	// Ticket 2: 30 min wait
	db.Exec(`INSERT INTO "Tickets" (id, status, "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?)`,
		2, "open", tenantID, t0, t0)
	db.Exec(`INSERT INTO "Messages" (id, body, "ticketId", "fromMe", "tenantId", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?)`,
		"msg-2", "resp", 2, true, tenantID, t0.Add(30*time.Minute), t0.Add(30*time.Minute))

	result := calculateTME(tenantID, db)
	assert.InDelta(t, 20.0, result, 0.1, "TME average of 10 and 30 min should be ~20 minutes")
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
