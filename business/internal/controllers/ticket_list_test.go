package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupTicketListDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func newTicketListContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req, _ := http.NewRequest(method, path, nil)
	c.Request = req
	c.Set("tenantId", tenantID)
	c.Set("alcance", "tenant")
	c.Set("userId", float64(1))
	scoped := db.Where(`"tenantId" = ?`, tenantID)
	c.Set("db", scoped)
	return c, w
}

func TestTicketController_ListTickets_TenantIsolation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTicketListDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantA)
	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "pending", tenantB)

	ctrl := &TicketController{updateTicket: nil, broadcast: nil}
	c, w := newTicketListContext(t, db, tenantA, "GET", "/tickets")

	ctrl.ListTickets(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	tickets := resp["tickets"].([]interface{})
	assert.Len(t, tickets, 1)
	assert.Equal(t, float64(1), resp["count"])
}

func TestTicketController_ListTickets_FilterByStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTicketListDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantID)
	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "closed", tenantID)

	ctrl := &TicketController{updateTicket: nil, broadcast: nil}
	c, w := newTicketListContext(t, db, tenantID, "GET", "/tickets?status=open")
	c.Request.URL.RawQuery = "status=open"

	ctrl.ListTickets(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	tickets := resp["tickets"].([]interface{})
	assert.Len(t, tickets, 1)
}

func TestTicketController_ShowTicket_Found(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTicketListDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Tickets" (status, "lastMessage", "tenantId") VALUES (?,?,?)`, "open", "hello", tenantID)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	ctrl := &TicketController{updateTicket: nil, broadcast: nil}
	c, w := newTicketListContext(t, db, tenantID, "GET", fmt.Sprintf("/tickets/%d", id))
	c.Params = gin.Params{{Key: "ticketId", Value: fmt.Sprintf("%d", id)}}

	ctrl.ShowTicket(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var ticket map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &ticket))
	assert.Equal(t, "hello", ticket["lastMessage"])
}

func TestTicketController_ShowTicket_CrossTenant404(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTicketListDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Tickets" (status, "tenantId") VALUES (?,?)`, "open", tenantA)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	ctrl := &TicketController{updateTicket: nil, broadcast: nil}
	c, w := newTicketListContext(t, db, tenantB, "GET", fmt.Sprintf("/tickets/%d", id))
	c.Params = gin.Params{{Key: "ticketId", Value: fmt.Sprintf("%d", id)}}

	ctrl.ShowTicket(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
