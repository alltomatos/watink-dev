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
	"gorm.io/gorm"

	"github.com/alltomatos/watinkdev/business/internal/testutil"
)

func setupTagTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func setupTagContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
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

func TestTagController_List_TenantIsolation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTagTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Tags" (name, color, "tenantId") VALUES (?,?,?)`, "Urgente", "red", tenantA)
	db.Exec(`INSERT INTO "Tags" (name, color, "tenantId") VALUES (?,?,?)`, "Outro", "blue", tenantB)

	ctrl := NewTagController()
	c, w := setupTagContext(t, db, tenantA, "GET", "/tags", nil)

	ctrl.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var tags []map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &tags))
	assert.Len(t, tags, 1)
	assert.Equal(t, "Urgente", tags[0]["name"])
}

func TestTagController_Create_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTagTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{"name": "VIP", "color": "gold"})
	ctrl := NewTagController()
	c, w := setupTagContext(t, db, tenantID, "POST", "/tags", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var tag map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &tag))
	assert.Equal(t, "VIP", tag["name"])
	assert.Equal(t, "gold", tag["color"])
}

func TestTagController_Update_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTagTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Tags" (name, color, "tenantId") VALUES (?,?,?)`, "Antigo", "green", tenantID)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	payload, _ := json.Marshal(map[string]string{"name": "Novo", "color": "purple"})
	ctrl := NewTagController()
	c, w := setupTagContext(t, db, tenantID, "PUT", fmt.Sprintf("/tags/%d", id), payload)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", id)}}

	ctrl.Update(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var tag map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &tag))
	assert.Equal(t, "Novo", tag["name"])
}

func TestTagController_Update_CrossTenant404(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTagTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Tags" (name, color, "tenantId") VALUES (?,?,?)`, "Secret", "black", tenantA)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	payload, _ := json.Marshal(map[string]string{"name": "Hacked"})
	ctrl := NewTagController()
	c, w := setupTagContext(t, db, tenantB, "PUT", fmt.Sprintf("/tags/%d", id), payload)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", id)}}

	ctrl.Update(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestTagController_Delete_Archive(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTagTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Tags" (name, color, "tenantId") VALUES (?,?,?)`, "Temp", "gray", tenantID)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	ctrl := NewTagController()
	c, w := setupTagContext(t, db, tenantID, "DELETE", fmt.Sprintf("/tags/%d", id), nil)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", id)}}

	ctrl.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Tag archived", resp["message"])
}

func TestTagController_Delete_ForceDelete(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTagTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Tags" (name, color, "tenantId") VALUES (?,?,?)`, "ToDelete", "red", tenantID)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	ctrl := NewTagController()
	c, w := setupTagContext(t, db, tenantID, "DELETE", fmt.Sprintf("/tags/%d?forceDelete=true", id), nil)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", id)}}
	c.Request.URL.RawQuery = "forceDelete=true"

	ctrl.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Tag deleted", resp["message"])
}

func TestTagController_Delete_CrossTenant404(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTagTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Tags" (name, color, "tenantId") VALUES (?,?,?)`, "Private", "orange", tenantA)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	ctrl := NewTagController()
	c, w := setupTagContext(t, db, tenantB, "DELETE", fmt.Sprintf("/tags/%d", id), nil)
	c.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", id)}}

	ctrl.Delete(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestTagController_SyncEntityTags(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTagTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Tags" (name, color, "tenantId") VALUES (?,?,?)`, "T1", "red", tenantID)
	var tagID int
	db.Raw(`SELECT LASTVAL()`).Scan(&tagID)

	payload, _ := json.Marshal(map[string]interface{}{"tagIds": []int{tagID}})
	ctrl := NewTagController()
	c, w := setupTagContext(t, db, tenantID, "PUT", "/entities/ticket/42/tags/sync", payload)
	c.Params = gin.Params{
		{Key: "entityType", Value: "ticket"},
		{Key: "id", Value: "42"},
	}

	ctrl.SyncEntityTags(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Tags synced", resp["message"])

	var count int64
	db.Raw(`SELECT count(*) FROM "EntityTags" WHERE "tenantId" = ? AND "entityId" = 42`, tenantID).Scan(&count)
	assert.Equal(t, int64(1), count)
}
