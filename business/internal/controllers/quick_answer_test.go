package controllers

import (
	"bytes"
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

func setupQATestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func setupQAContext(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
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

func TestQuickAnswerController_List(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "QuickAnswers" (shortcut, message, "tenantId") VALUES (?,?,?)`, "/oi", "Olá!", tenantA)
	db.Exec(`INSERT INTO "QuickAnswers" (shortcut, message, "tenantId") VALUES (?,?,?)`, "/bye", "Bye!", tenantB)

	ctrl := NewQuickAnswerController(nil)
	c, w := setupQAContext(t, db, tenantA, "GET", "/quickAnswers", nil)

	ctrl.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var qas []map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &qas))
	assert.Len(t, qas, 1)
	assert.Equal(t, "/oi", qas[0]["shortcut"])
}

func TestQuickAnswerController_Create_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{"shortcut": "/hello", "message": "Hello there!"})
	ctrl := NewQuickAnswerController(nil)
	c, w := setupQAContext(t, db, tenantID, "POST", "/quickAnswers", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var qa map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &qa))
	assert.Equal(t, "/hello", qa["shortcut"])
}

func TestQuickAnswerController_Show_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "QuickAnswers" (shortcut, message, "tenantId") VALUES (?,?,?)`, "/show", "Show msg", tenantID)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	ctrl := NewQuickAnswerController(nil)
	c, w := setupQAContext(t, db, tenantID, "GET", fmt.Sprintf("/quickAnswers/%d", id), nil)
	c.Params = gin.Params{{Key: "quickAnswerId", Value: fmt.Sprintf("%d", id)}}

	ctrl.Show(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var qa map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &qa))
	assert.Equal(t, "/show", qa["shortcut"])
}

func TestQuickAnswerController_Show_CrossTenant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "QuickAnswers" (shortcut, message, "tenantId") VALUES (?,?,?)`, "/secret", "Secret", tenantA)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	ctrl := NewQuickAnswerController(nil)
	c, w := setupQAContext(t, db, tenantB, "GET", fmt.Sprintf("/quickAnswers/%d", id), nil)
	c.Params = gin.Params{{Key: "quickAnswerId", Value: fmt.Sprintf("%d", id)}}

	ctrl.Show(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestQuickAnswerController_Update_FetchNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantID := uuid.New()

	ctrl := NewQuickAnswerController(nil)
	c, w := setupQAContext(t, db, tenantID, "PUT", "/quickAnswers/9999", nil)
	c.Params = gin.Params{{Key: "quickAnswerId", Value: "9999"}}

	ctrl.Update(c)

	// Record not found → 500 via RespondWithInternalError
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestQuickAnswerController_Delete_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "QuickAnswers" (shortcut, message, "tenantId") VALUES (?,?,?)`, "/del", "Del msg", tenantID)
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	ctrl := NewQuickAnswerController(nil)
	c, w := setupQAContext(t, db, tenantID, "DELETE", fmt.Sprintf("/quickAnswers/%d", id), nil)
	c.Params = gin.Params{{Key: "quickAnswerId", Value: fmt.Sprintf("%d", id)}}

	ctrl.Delete(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Quick answer deleted successfully", resp["message"])
}

func TestQuickAnswerController_Delete_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantID := uuid.New()

	ctrl := NewQuickAnswerController(nil)
	c, w := setupQAContext(t, db, tenantID, "DELETE", "/quickAnswers/9999", nil)
	c.Params = gin.Params{{Key: "quickAnswerId", Value: "9999"}}

	ctrl.Delete(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

type mockQAPublisher struct{}

func (m *mockQAPublisher) PublishCommand(routingKey string, payload interface{}) error { return nil }

func TestQuickAnswerController_Create_TypeDefault(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{"shortcut": "/typedefault", "message": "msg"})
	ctrl := NewQuickAnswerController(&mockQAPublisher{})
	c, w := setupQAContext(t, db, tenantID, "POST", "/quickAnswers", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var qa map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &qa))
	assert.Equal(t, "text", qa["type"])
}

func TestQuickAnswerController_Create_InvalidType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{"shortcut": "/badtype", "message": "msg", "type": "invalid_type"})
	ctrl := NewQuickAnswerController(&mockQAPublisher{})
	c, w := setupQAContext(t, db, tenantID, "POST", "/quickAnswers", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Contains(t, resp["error"], "invalid type")
}

func TestQuickAnswerController_Create_InvalidContent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]string{"shortcut": "/badcontent", "message": "msg", "content": "not-json"})
	ctrl := NewQuickAnswerController(&mockQAPublisher{})
	c, w := setupQAContext(t, db, tenantID, "POST", "/quickAnswers", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Contains(t, resp["error"], "content must be valid JSON")
}

func TestQuickAnswerController_Create_ValidContent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantID := uuid.New()

	content := `{"body":"test","buttons":[{"id":"b1","label":"OK"}]}`
	payload, _ := json.Marshal(map[string]string{
		"shortcut": "/buttons",
		"message":  "msg",
		"type":     "interactive_buttons",
		"content":  content,
	})
	ctrl := NewQuickAnswerController(&mockQAPublisher{})
	c, w := setupQAContext(t, db, tenantID, "POST", "/quickAnswers", payload)

	ctrl.Create(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var qa map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &qa))
	assert.Equal(t, "interactive_buttons", qa["type"])
	assert.Equal(t, content, qa["content"])
}

func TestQuickAnswerController_Update_TypeAndContent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQATestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "QuickAnswers" (shortcut, message, "tenantId", "dataJson", content) VALUES (?,?,?,?::jsonb,?::jsonb)`, "/upd", "Original", tenantID, "null", "null")
	var id int
	db.Raw(`SELECT LASTVAL()`).Scan(&id)

	pollContent := `{"question":"Q?","options":["A","B"],"max_selections":1,"capture_results":false,"on_answer":null}`
	payload, _ := json.Marshal(map[string]string{
		"shortcut": "/upd",
		"message":  "Updated",
		"type":     "poll",
		"content":  pollContent,
	})
	ctrl := NewQuickAnswerController(&mockQAPublisher{})
	c, w := setupQAContext(t, db, tenantID, "PUT", fmt.Sprintf("/quickAnswers/%d", id), payload)
	c.Params = gin.Params{{Key: "quickAnswerId", Value: fmt.Sprintf("%d", id)}}

	ctrl.Update(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var qa map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &qa))
	assert.Equal(t, "poll", qa["type"])
	assert.Equal(t, pollContent, qa["content"])
	assert.Equal(t, "Updated", qa["message"])
}
