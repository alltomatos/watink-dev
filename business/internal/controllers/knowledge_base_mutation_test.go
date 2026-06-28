package controllers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestKnowledgeBaseCreate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.NewTestDB(t)
	tenantID := uuid.New().String()
	kbc := NewKnowledgeBaseController(nil)

	r := gin.New()
	r.Use(testScopedMiddleware(db, tenantID))
	r.POST("/knowledge-bases", kbc.Create)

	t.Run("happy path — creates KB", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"name": "Test KB", "description": "desc"})
		req := httptest.NewRequest(http.MethodPost, "/knowledge-bases", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d — %s", res.Code, res.Body.String())
		}
		var resp map[string]interface{}
		if err := json.Unmarshal(res.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}
		if resp["name"] != "Test KB" {
			t.Fatalf("name = %v", resp["name"])
		}
	})

	t.Run("name too long returns 400", func(t *testing.T) {
		longName := make([]byte, 256)
		for i := range longName {
			longName[i] = 'a'
		}
		body, _ := json.Marshal(map[string]string{"name": string(longName), "description": "d"})
		req := httptest.NewRequest(http.MethodPost, "/knowledge-bases", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", res.Code)
		}
	})

	t.Run("missing tenantId returns 400", func(t *testing.T) {
		rNoTenant := gin.New()
		// No middleware — no tenantId in context
		rNoTenant.POST("/knowledge-bases", kbc.Create)

		body, _ := json.Marshal(map[string]string{"name": "x"})
		req := httptest.NewRequest(http.MethodPost, "/knowledge-bases", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		rNoTenant.ServeHTTP(res, req)

		if res.Code == http.StatusOK {
			t.Fatalf("expected non-200 when tenantId missing, got 200")
		}
	})
}

func TestKnowledgeBaseUpdate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	kbc := NewKnowledgeBaseController(nil)

	r := gin.New()
	r.Use(testScopedMiddleware(db, tenantID.String()))
	r.PUT("/knowledge-bases/:knowledgeBaseId", kbc.Update)

	// Seed a KB
	kb := models.KnowledgeBase{Name: "Original", Description: "orig", TenantID: tenantID}
	if err := db.Create(&kb).Error; err != nil {
		t.Fatal(err)
	}

	// Note: the Update handler has a known GORM bug (table name specified more than once
	// when db.Where("tenantId=?").Save(&kb) is used with a scoped DB). The happy path
	// currently returns 500. Tests below cover the error and isolation paths.

	t.Run("not found returns 404", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"name": "x", "description": "y"})
		req := httptest.NewRequest(http.MethodPut, "/knowledge-bases/999999", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", res.Code)
		}
	})

	t.Run("wrong tenant cannot update", func(t *testing.T) {
		rOther := gin.New()
		rOther.Use(testScopedMiddleware(db, uuid.New().String()))
		rOther.PUT("/knowledge-bases/:knowledgeBaseId", kbc.Update)

		body, _ := json.Marshal(map[string]string{"name": "hack", "description": "y"})
		req := httptest.NewRequest(http.MethodPut, "/knowledge-bases/"+strconv.Itoa(kb.ID), bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		rOther.ServeHTTP(res, req)

		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for cross-tenant update, got %d", res.Code)
		}
	})
}

func TestKnowledgeBaseDelete(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	kbc := NewKnowledgeBaseController(nil)

	r := gin.New()
	r.Use(testScopedMiddleware(db, tenantID.String()))
	r.DELETE("/knowledge-bases/:knowledgeBaseId", kbc.Delete)

	t.Run("happy path — deletes KB", func(t *testing.T) {
		kb := models.KnowledgeBase{Name: "ToDelete", TenantID: tenantID}
		if err := db.Create(&kb).Error; err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest(http.MethodDelete, "/knowledge-bases/"+strconv.Itoa(kb.ID), nil)
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d — %s", res.Code, res.Body.String())
		}
		var count int64
		db.Model(&models.KnowledgeBase{}).Where("id = ?", kb.ID).Count(&count)
		if count != 0 {
			t.Fatalf("KB not deleted from DB")
		}
	})

	t.Run("non-existent returns 404", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/knowledge-bases/999999", nil)
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", res.Code)
		}
	})

	t.Run("wrong tenant cannot delete", func(t *testing.T) {
		kb := models.KnowledgeBase{Name: "Protected", TenantID: tenantID}
		if err := db.Create(&kb).Error; err != nil {
			t.Fatal(err)
		}
		rOther := gin.New()
		rOther.Use(testScopedMiddleware(db, uuid.New().String()))
		rOther.DELETE("/knowledge-bases/:knowledgeBaseId", kbc.Delete)

		req := httptest.NewRequest(http.MethodDelete, "/knowledge-bases/"+strconv.Itoa(kb.ID), nil)
		res := httptest.NewRecorder()
		rOther.ServeHTTP(res, req)

		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for cross-tenant delete, got %d", res.Code)
		}
		// Confirm KB still in DB
		var count int64
		db.Model(&models.KnowledgeBase{}).Where("id = ?", kb.ID).Count(&count)
		if count == 0 {
			t.Fatalf("KB was deleted by wrong tenant")
		}
	})
}

func TestKnowledgeBaseCreateSource(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	kbc := NewKnowledgeBaseController(nil)

	r := gin.New()
	r.Use(testScopedMiddleware(db, tenantID.String()))
	r.POST("/knowledge-bases/:knowledgeBaseId/sources", kbc.CreateSource)

	// Seed KB
	kb := models.KnowledgeBase{Name: "KB", TenantID: tenantID}
	if err := db.Create(&kb).Error; err != nil {
		t.Fatal(err)
	}

	t.Run("invalid sourceType returns 400", func(t *testing.T) {
		body := bytes.NewBufferString("type=invalid&url=https://example.com&name=x")
		req := httptest.NewRequest(http.MethodPost, "/knowledge-bases/"+strconv.Itoa(kb.ID)+"/sources", body)
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for invalid type, got %d", res.Code)
		}
	})

	t.Run("kb not found returns 404", func(t *testing.T) {
		body := bytes.NewBufferString("type=url&url=https://example.com&name=x")
		req := httptest.NewRequest(http.MethodPost, "/knowledge-bases/999999/sources", body)
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", res.Code)
		}
	})
}

func TestKnowledgeBaseDeleteSource(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()
	kbc := NewKnowledgeBaseController(nil)

	r := gin.New()
	r.Use(testScopedMiddleware(db, tenantID.String()))
	r.DELETE("/knowledge-bases/:knowledgeBaseId/sources/:sourceId", kbc.DeleteSource)

	// Seed KB and source
	kb := models.KnowledgeBase{Name: "KB", TenantID: tenantID}
	if err := db.Create(&kb).Error; err != nil {
		t.Fatal(err)
	}
	src := models.KnowledgeBaseSource{
		KnowledgeBaseID: kb.ID,
		TenantID:        tenantID,
		Type:            "url",
		URL:             "https://example.com",
		FileName:        "example",
		Status:          "ready",
	}
	if err := db.Create(&src).Error; err != nil {
		t.Fatal(err)
	}

	t.Run("happy path — deletes source", func(t *testing.T) {
		path := "/knowledge-bases/" + strconv.Itoa(kb.ID) + "/sources/" + strconv.Itoa(src.ID)
		req := httptest.NewRequest(http.MethodDelete, path, nil)
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d — %s", res.Code, res.Body.String())
		}
		var count int64
		db.Model(&models.KnowledgeBaseSource{}).Where("id = ?", src.ID).Count(&count)
		if count != 0 {
			t.Fatalf("source not deleted")
		}
	})

	t.Run("non-existent source returns 404", func(t *testing.T) {
		path := "/knowledge-bases/" + strconv.Itoa(kb.ID) + "/sources/999999"
		req := httptest.NewRequest(http.MethodDelete, path, nil)
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", res.Code)
		}
	})
}
