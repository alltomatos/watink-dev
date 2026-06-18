package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
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

func setupFlowTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared&_flow_"+t.Name()), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.Exec(`CREATE TABLE IF NOT EXISTS "Flows" (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		"triggerType" TEXT DEFAULT '',
		"triggerValue" TEXT DEFAULT '',
		nodes TEXT DEFAULT '{}',
		edges TEXT DEFAULT '{}',
		active BOOLEAN DEFAULT false,
		"whatsappId" INTEGER,
		"tenantId" TEXT NOT NULL,
		"createdAt" DATETIME,
		"updatedAt" DATETIME
	)`).Error)
	return db
}

func setupFlowContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	var req *http.Request
	if body != nil {
		req, _ = http.NewRequest(method, path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, path, nil)
	}
	c.Request = req
	c.Set("tenantId", tenantID)
	c.Set("userProfile", "admin")
	c.Set("userId", float64(1))
	scoped := db.Where(`"tenantId" = ?`, tenantID)
	c.Set("db", scoped)
	return c, w
}

func TestFlowController_List_ReturnsOnlyOwnTenant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantA, tenantB := uuid.New(), uuid.New()
	db.Exec(`INSERT INTO "Flows" (name,"tenantId") VALUES (?,?)`, "Flow A", tenantA)
	db.Exec(`INSERT INTO "Flows" (name,"tenantId") VALUES (?,?)`, "Flow B", tenantB)

	ctrl := NewFlowController()
	c, w := setupFlowContext(t, db, tenantA, "GET", "/flows", nil)
	ctrl.List(c)

	require.Equal(t, http.StatusOK, w.Code)
	var flows []map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &flows))
	assert.Len(t, flows, 1)
	assert.Equal(t, "Flow A", flows[0]["name"])
}

func TestFlowController_Create_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{"name": "Novo Flow", "active": true})
	ctrl := NewFlowController()
	c, w := setupFlowContext(t, db, tenantID, "POST", "/flows", payload)
	ctrl.Create(c)

	require.Equal(t, http.StatusOK, w.Code)
	var flow map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &flow))
	assert.Equal(t, "Novo Flow", flow["name"])
}

func TestFlowController_Show_CrossTenantBlocked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantA, tenantB := uuid.New(), uuid.New()
	db.Exec(`INSERT INTO "Flows" (name,"tenantId") VALUES (?,?)`, "Flow A", tenantA)

	var flow struct{ ID int }
	db.Raw(`SELECT id FROM "Flows" WHERE "tenantId" = ?`, tenantA).Scan(&flow)

	ctrl := NewFlowController()
	c, w := setupFlowContext(t, db, tenantB, "GET", fmt.Sprintf("/flows/%d", flow.ID), nil)
	c.Params = gin.Params{{Key: "flowId", Value: fmt.Sprintf("%d", flow.ID)}}
	ctrl.Show(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestFlowController_Update_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()
	db.Exec(`INSERT INTO "Flows" (name,"tenantId") VALUES (?,?)`, "Antigo", tenantID)

	var flow struct{ ID int }
	db.Raw(`SELECT id FROM "Flows" WHERE "tenantId" = ?`, tenantID).Scan(&flow)

	payload, _ := json.Marshal(map[string]interface{}{"name": "Atualizado", "active": false})
	ctrl := NewFlowController()
	c, w := setupFlowContext(t, db, tenantID, "PUT", fmt.Sprintf("/flows/%d", flow.ID), payload)
	c.Params = gin.Params{{Key: "flowId", Value: fmt.Sprintf("%d", flow.ID)}}
	ctrl.Update(c)

	require.Equal(t, http.StatusOK, w.Code)
	var updated map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &updated))
	assert.Equal(t, "Atualizado", updated["name"])
}

func TestFlowController_Delete_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()
	db.Exec(`INSERT INTO "Flows" (name,"tenantId") VALUES (?,?)`, "Del Flow", tenantID)

	var flow struct{ ID int }
	db.Raw(`SELECT id FROM "Flows" WHERE "tenantId" = ?`, tenantID).Scan(&flow)

	ctrl := NewFlowController()
	c, w := setupFlowContext(t, db, tenantID, "DELETE", fmt.Sprintf("/flows/%d", flow.ID), nil)
	c.Params = gin.Params{{Key: "flowId", Value: fmt.Sprintf("%d", flow.ID)}}
	ctrl.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var count int64
	db.Raw(`SELECT COUNT(*) FROM "Flows" WHERE "tenantId" = ?`, tenantID).Scan(&count)
	assert.Equal(t, int64(0), count)
}

func TestFlowController_Delete_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	ctrl := NewFlowController()
	c, w := setupFlowContext(t, db, tenantID, "DELETE", "/flows/9999", nil)
	c.Params = gin.Params{{Key: "flowId", Value: "9999"}}
	ctrl.Delete(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
