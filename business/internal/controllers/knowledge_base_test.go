package controllers

import (
	"bytes"
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

// ── helpers ───────────────────────────────────────────────────────────────────

func setupKBTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	tmpFile := t.TempDir() + "/kb_test.db"
	db, err := gorm.Open(sqlite.Open(tmpFile), &gorm.Config{})
	require.NoError(t, err)
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	db.Exec(`CREATE TABLE "KnowledgeBases" (
		"id" INTEGER PRIMARY KEY AUTOINCREMENT,
		"name" TEXT NOT NULL,
		"description" TEXT,
		"tenantId" TEXT NOT NULL,
		"createdAt" DATETIME,
		"updatedAt" DATETIME
	)`)
	db.Exec(`CREATE TABLE "KnowledgeBaseSources" (
		"id" INTEGER PRIMARY KEY AUTOINCREMENT,
		"knowledgeBaseId" INTEGER NOT NULL,
		"tenantId" TEXT NOT NULL,
		"type" TEXT NOT NULL,
		"url" TEXT,
		"fileName" TEXT,
		"status" TEXT DEFAULT 'ready',
		"createdAt" DATETIME,
		"updatedAt" DATETIME
	)`)
	return db
}

func setupKBContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
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

// ── tests ─────────────────────────────────────────────────────────────────────

func TestKnowledgeBaseController_List_Empty(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupKBTestDB(t)
	tenantID := uuid.New()

	ctrl := NewKnowledgeBaseController()
	c, w := setupKBContext(t, db, tenantID, "GET", "/knowledge-bases", nil)

	ctrl.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Empty(t, resp)
}

func TestKnowledgeBaseController_List_CrossTenantIsolation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupKBTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "KnowledgeBases" (name, "tenantId") VALUES (?,?)`, "KB-A", tenantA)
	db.Exec(`INSERT INTO "KnowledgeBases" (name, "tenantId") VALUES (?,?)`, "KB-B", tenantB)

	ctrl := NewKnowledgeBaseController()
	c, w := setupKBContext(t, db, tenantA, "GET", "/knowledge-bases", nil)

	ctrl.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Len(t, resp, 1)
	assert.Equal(t, "KB-A", resp[0]["name"])
}

func TestKnowledgeBaseController_Show_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupKBTestDB(t)
	tenantID := uuid.New()

	ctrl := NewKnowledgeBaseController()
	c, w := setupKBContext(t, db, tenantID, "GET", "/knowledge-bases/9999", nil)
	c.Params = gin.Params{{Key: "knowledgeBaseId", Value: "9999"}}

	ctrl.Show(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestKnowledgeBaseController_Show_CrossTenant404(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupKBTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "KnowledgeBases" (name, "tenantId") VALUES (?,?)`, "KB-A", tenantA)
	var id int
	db.Raw(`SELECT last_insert_rowid()`).Scan(&id)

	ctrl := NewKnowledgeBaseController()
	c, w := setupKBContext(t, db, tenantB, "GET", "/knowledge-bases/1", nil)
	c.Params = gin.Params{{Key: "knowledgeBaseId", Value: "1"}}

	ctrl.Show(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestKnowledgeBaseController_Create_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupKBTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{
		"name":        "FAQ Base",
		"description": "Frequently asked questions",
	})

	ctrl := NewKnowledgeBaseController()
	c, w := setupKBContext(t, db, tenantID, "POST", "/knowledge-bases", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "FAQ Base", resp["name"])
}

func TestKnowledgeBaseController_Delete_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupKBTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "KnowledgeBases" (name, "tenantId") VALUES (?,?)`, "To Delete", tenantID)
	var id int
	db.Raw(`SELECT last_insert_rowid()`).Scan(&id)

	ctrl := NewKnowledgeBaseController()
	c, w := setupKBContext(t, db, tenantID, "DELETE", "/knowledge-bases/1", nil)
	c.Params = gin.Params{{Key: "knowledgeBaseId", Value: "1"}}

	ctrl.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestKnowledgeBaseController_Delete_CrossTenantBlocked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupKBTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "KnowledgeBases" (name, "tenantId") VALUES (?,?)`, "KB-A", tenantA)

	ctrl := NewKnowledgeBaseController()
	c, w := setupKBContext(t, db, tenantB, "DELETE", "/knowledge-bases/1", nil)
	c.Params = gin.Params{{Key: "knowledgeBaseId", Value: "1"}}

	ctrl.Delete(c)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var count int64
	db.Raw(`SELECT COUNT(*) FROM "KnowledgeBases"`).Scan(&count)
	assert.Equal(t, int64(1), count, "cross-tenant delete must not remove the record")
}
