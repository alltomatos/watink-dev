package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupQueueTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func setupQueueContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
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
	c.Set("alcance", "tenant")
	c.Set("userId", float64(1))
	scoped := db.Where(`"tenantId" = ?`, tenantID)
	c.Set("db", scoped)

	return c, w
}

func TestQueueController_ListQueues_ReturnsOnlyOwnTenant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQueueTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Queues" (name, color, "tenantId") VALUES (?,?,?)`, "Suporte", "#FF0000", tenantA)
	db.Exec(`INSERT INTO "Queues" (name, color, "tenantId") VALUES (?,?,?)`, "Vendas", "#00FF00", tenantB)

	ctrl := NewQueueController()
	c, w := setupQueueContext(t, db, tenantA, "GET", "/queue", nil)

	ctrl.ListQueues(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var queues []map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &queues))
	assert.Len(t, queues, 1)
	assert.Equal(t, "Suporte", queues[0]["name"])
}

func TestQueueController_ShowQueue_Found(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQueueTestDB(t)
	tenantID := uuid.New()

	var inserted models.Queue
	db.Exec(`INSERT INTO "Queues" (name, color, "tenantId") VALUES (?,?,?)`, "Financeiro", "#0000FF", tenantID)
	db.Raw(`SELECT * FROM "Queues" WHERE name = ?`, "Financeiro").Scan(&inserted)

	ctrl := NewQueueController()
	c, w := setupQueueContext(t, db, tenantID, "GET", fmt.Sprintf("/queue/%d", inserted.ID), nil)
	c.Params = gin.Params{{Key: "queueId", Value: fmt.Sprintf("%d", inserted.ID)}}

	ctrl.ShowQueue(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var q map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &q))
	assert.Equal(t, "Financeiro", q["name"])
}

func TestQueueController_ShowQueue_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQueueTestDB(t)
	tenantID := uuid.New()

	ctrl := NewQueueController()
	c, w := setupQueueContext(t, db, tenantID, "GET", "/queue/9999", nil)
	c.Params = gin.Params{{Key: "queueId", Value: "9999"}}

	ctrl.ShowQueue(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestQueueController_ShowQueue_CrossTenantBlocked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQueueTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Queues" (name, color, "tenantId") VALUES (?,?,?)`, "Privado", "#123456", tenantA)
	var inserted models.Queue
	db.Raw(`SELECT * FROM "Queues" WHERE name = ?`, "Privado").Scan(&inserted)

	ctrl := NewQueueController()
	c, w := setupQueueContext(t, db, tenantB, "GET", fmt.Sprintf("/queue/%d", inserted.ID), nil)
	c.Params = gin.Params{{Key: "queueId", Value: fmt.Sprintf("%d", inserted.ID)}}

	ctrl.ShowQueue(c)

	assert.Equal(t, http.StatusNotFound, w.Code, "tenant B must not see tenant A's queue")
}

func TestQueueController_CreateQueue_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQueueTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{"name": "NovaSuporte", "color": "#ABCDEF"})
	ctrl := NewQueueController()
	c, w := setupQueueContext(t, db, tenantID, "POST", "/queue", payload)

	ctrl.CreateQueue(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var q map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &q))
	assert.Equal(t, "NovaSuporte", q["name"])
}

func TestQueueController_UpdateQueue_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQueueTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Queues" (name, color, "tenantId") VALUES (?,?,?)`, "Antigo", "#111111", tenantID)
	var inserted models.Queue
	db.Raw(`SELECT * FROM "Queues" WHERE name = ?`, "Antigo").Scan(&inserted)

	payload, _ := json.Marshal(map[string]string{"name": "Novo", "color": "#222222"})
	ctrl := NewQueueController()
	c, w := setupQueueContext(t, db, tenantID, "PUT", fmt.Sprintf("/queue/%d", inserted.ID), payload)
	c.Params = gin.Params{{Key: "queueId", Value: fmt.Sprintf("%d", inserted.ID)}}

	ctrl.UpdateQueue(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var q map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &q))
	assert.Equal(t, "Novo", q["name"])
}

func TestQueueController_DeleteQueue_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQueueTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Queues" (name, color, "tenantId") VALUES (?,?,?)`, "Temp", "#999999", tenantID)
	var inserted models.Queue
	db.Raw(`SELECT * FROM "Queues" WHERE name = ?`, "Temp").Scan(&inserted)

	ctrl := NewQueueController()
	c, w := setupQueueContext(t, db, tenantID, "DELETE", fmt.Sprintf("/queue/%d", inserted.ID), nil)
	c.Params = gin.Params{{Key: "queueId", Value: fmt.Sprintf("%d", inserted.ID)}}

	ctrl.DeleteQueue(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Contains(t, resp["message"], "deleted")
}

func TestQueueController_DeleteQueue_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQueueTestDB(t)
	tenantID := uuid.New()

	ctrl := NewQueueController()
	c, w := setupQueueContext(t, db, tenantID, "DELETE", "/queue/8888", nil)
	c.Params = gin.Params{{Key: "queueId", Value: "8888"}}

	ctrl.DeleteQueue(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
