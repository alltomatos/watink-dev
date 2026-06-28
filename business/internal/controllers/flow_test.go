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

func setupFlowTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
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

	ctrl := NewFlowController(nil)
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
	ctrl := NewFlowController(nil)
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

	ctrl := NewFlowController(nil)
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
	ctrl := NewFlowController(nil)
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

	ctrl := NewFlowController(nil)
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

	ctrl := NewFlowController(nil)
	c, w := setupFlowContext(t, db, tenantID, "DELETE", "/flows/9999", nil)
	c.Params = gin.Params{{Key: "flowId", Value: "9999"}}
	ctrl.Delete(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// TestFlowController_Update_PartialPatch_PreservesGraph is the FB0-B1 regression:
// a flow with non-null nodes/edges/trigger/whatsapp/active must keep all of those
// when the PATCH carries only `name`. The old Save()-of-whole-struct zeroed them.
func TestFlowController_Update_PartialPatch_PreservesGraph(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	nodes := `[{"id":"start","type":"start","data":{}},{"id":"end","type":"end","data":{}}]`
	edges := `[{"id":"e1","source":"start","target":"end"}]`
	db.Exec(`INSERT INTO "Flows" (name,nodes,edges,active,"triggerType","triggerValue","whatsappId","tenantId")
		VALUES (?,?,?,?,?,?,?,?)`,
		"Antigo", nodes, edges, true, "whatsapp_message", "ola", 7, tenantID)

	var flow struct{ ID int }
	db.Raw(`SELECT id FROM "Flows" WHERE "tenantId" = ?`, tenantID).Scan(&flow)

	// PATCH carries ONLY name.
	payload, _ := json.Marshal(map[string]interface{}{"name": "Renomeado"})
	ctrl := NewFlowController(nil)
	c, w := setupFlowContext(t, db, tenantID, "PUT", fmt.Sprintf("/flows/%d", flow.ID), payload)
	c.Params = gin.Params{{Key: "flowId", Value: fmt.Sprintf("%d", flow.ID)}}
	ctrl.Update(c)

	require.Equal(t, http.StatusOK, w.Code)

	// Assert directly in the DB that every other field survived.
	var row struct {
		Name         string
		Nodes        string
		Edges        string
		Active       bool
		TriggerType  string
		TriggerValue string
		WhatsappID   *int
	}
	db.Raw(`SELECT name, nodes, edges, active, "triggerType" AS trigger_type,
		"triggerValue" AS trigger_value, "whatsappId" AS whatsapp_id
		FROM "Flows" WHERE id = ?`, flow.ID).Scan(&row)

	assert.Equal(t, "Renomeado", row.Name, "name should be patched")
	assert.JSONEq(t, nodes, row.Nodes, "nodes must be preserved")
	assert.JSONEq(t, edges, row.Edges, "edges must be preserved")
	assert.True(t, row.Active, "active must be preserved (not zeroed)")
	assert.Equal(t, "whatsapp_message", row.TriggerType, "triggerType must be preserved")
	assert.Equal(t, "ola", row.TriggerValue, "triggerValue must be preserved")
	require.NotNil(t, row.WhatsappID, "whatsappId must be preserved")
	assert.Equal(t, 7, *row.WhatsappID, "whatsappId value must be preserved")
}

// TestFlowController_Create_RejectsUnknownNodeType — FB0-B4: 422 on bad graph.
func TestFlowController_Create_RejectsUnknownNodeType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{
		"name":  "Ruim",
		"nodes": json.RawMessage(`[{"id":"a","type":"bogus","data":{}}]`),
	})
	ctrl := NewFlowController(nil)
	c, w := setupFlowContext(t, db, tenantID, "POST", "/flows", payload)
	ctrl.Create(c)

	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
}

// TestFlowController_Create_RejectsOrphanEdge — FB0-B4: 422 on orphan edge.
func TestFlowController_Create_RejectsOrphanEdge(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{
		"name":  "Orfa",
		"nodes": json.RawMessage(`[{"id":"a","type":"start","data":{}}]`),
		"edges": json.RawMessage(`[{"id":"e","source":"a","target":"ghost"}]`),
	})
	ctrl := NewFlowController(nil)
	c, w := setupFlowContext(t, db, tenantID, "POST", "/flows", payload)
	ctrl.Create(c)

	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
}

// TestFlowController_Create_AcceptsNoSchemaVersion — FB0-B4: absence = v1, not an error.
func TestFlowController_Create_AcceptsNoSchemaVersion(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{
		"name":   "Boa",
		"active": true,
		"nodes":  json.RawMessage(`[{"id":"a","type":"start","data":{}},{"id":"b","type":"end","data":{}}]`),
		"edges":  json.RawMessage(`[{"id":"e","source":"a","target":"b"}]`),
	})
	ctrl := NewFlowController(nil)
	c, w := setupFlowContext(t, db, tenantID, "POST", "/flows", payload)
	ctrl.Create(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

// TestFlowController_Stubs_Return501 — FB0-B2: AI/simulate stubs answer 501.
func TestFlowController_Stubs_Return501(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()
	ctrl := NewFlowController(nil)

	cAI, wAI := setupFlowContext(t, db, tenantID, "POST", "/flows/ai", []byte(`{}`))
	ctrl.AISuggest(cAI)
	assert.Equal(t, http.StatusNotImplemented, wAI.Code)
	assertCanonicalError(t, wAI)

	cSim, wSim := setupFlowContext(t, db, tenantID, "POST", "/flows/1/simulate", []byte(`{}`))
	cSim.Params = gin.Params{{Key: "flowId", Value: "1"}}
	ctrl.Simulate(cSim)
	assert.Equal(t, http.StatusNotImplemented, wSim.Code)
	assertCanonicalError(t, wSim)
}

// assertCanonicalError asserts the body is the canonical {"error":...} envelope
// the frontend relies on to detect the 501 (FB0-B2).
func assertCanonicalError(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	msg, ok := body["error"].(string)
	assert.True(t, ok && msg != "", "response must carry a non-empty canonical \"error\" field, got: %s", w.Body.String())
}

// TestFlowController_Update_ActiveFalse_WritesFalse — FB0-B1: an explicit
// active:false flips a previously-active flow to false (map-Updates does not
// skip the false), while an OMITTED active is preserved (covered elsewhere).
func TestFlowController_Update_ActiveFalse_WritesFalse(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Flows" (name,active,"tenantId") VALUES (?,?,?)`, "Ativo", true, tenantID)
	var flow struct{ ID int }
	db.Raw(`SELECT id FROM "Flows" WHERE "tenantId" = ?`, tenantID).Scan(&flow)

	payload, _ := json.Marshal(map[string]interface{}{"active": false})
	ctrl := NewFlowController(nil)
	c, w := setupFlowContext(t, db, tenantID, "PUT", fmt.Sprintf("/flows/%d", flow.ID), payload)
	c.Params = gin.Params{{Key: "flowId", Value: fmt.Sprintf("%d", flow.ID)}}
	ctrl.Update(c)

	require.Equal(t, http.StatusOK, w.Code)
	var row struct{ Active bool }
	db.Raw(`SELECT active FROM "Flows" WHERE id = ?`, flow.ID).Scan(&row)
	assert.False(t, row.Active, "explicit active:false must flip the flow to inactive")
}

// TestFlowController_Update_RejectsInvalidGraph — FB0-B4: a PUT carrying an
// illegal graph (unknown node type) is rejected with 422.
func TestFlowController_Update_RejectsInvalidGraph(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Flows" (name,"tenantId") VALUES (?,?)`, "Base", tenantID)
	var flow struct{ ID int }
	db.Raw(`SELECT id FROM "Flows" WHERE "tenantId" = ?`, tenantID).Scan(&flow)

	payload, _ := json.Marshal(map[string]interface{}{
		"nodes": json.RawMessage(`[{"id":"a","type":"bogus","data":{}}]`),
	})
	ctrl := NewFlowController(nil)
	c, w := setupFlowContext(t, db, tenantID, "PUT", fmt.Sprintf("/flows/%d", flow.ID), payload)
	c.Params = gin.Params{{Key: "flowId", Value: fmt.Sprintf("%d", flow.ID)}}
	ctrl.Update(c)

	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
}

// TestFlowController_Create_PersistsWhatsAppID — the chosen WhatsApp connection
// is persisted (was silently dropped before flowInput exposed whatsappId).
func TestFlowController_Create_PersistsWhatsAppID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	wid := 5
	payload, _ := json.Marshal(map[string]interface{}{"name": "Com conexao", "whatsappId": wid})
	ctrl := NewFlowController(nil)
	c, w := setupFlowContext(t, db, tenantID, "POST", "/flows", payload)
	ctrl.Create(c)
	require.Equal(t, http.StatusOK, w.Code)

	var row struct{ WhatsappID *int }
	db.Raw(`SELECT "whatsappId" AS whatsapp_id FROM "Flows" WHERE "tenantId" = ?`, tenantID).Scan(&row)
	require.NotNil(t, row.WhatsappID, "whatsappId must be persisted, not dropped")
	assert.Equal(t, wid, *row.WhatsappID)
}

// TestFlowController_Update_BlocksActivatingUnexecutableNode — guard de ativação:
// um flow com nó sem executor (database) NÃO pode ser ativado (quebraria em runtime).
func TestFlowController_Update_BlocksActivatingUnexecutableNode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	nodes := `[{"id":"a","type":"start","data":{}},{"id":"b","type":"database","data":{}}]`
	db.Exec(`INSERT INTO "Flows" (name,nodes,edges,active,"tenantId") VALUES (?,?,?,?,?)`,
		"Com DB", nodes, "[]", false, tenantID)
	var flow struct{ ID int }
	db.Raw(`SELECT id FROM "Flows" WHERE "tenantId" = ?`, tenantID).Scan(&flow)

	payload, _ := json.Marshal(map[string]interface{}{"active": true})
	ctrl := NewFlowController(nil)
	c, w := setupFlowContext(t, db, tenantID, "PUT", fmt.Sprintf("/flows/%d", flow.ID), payload)
	c.Params = gin.Params{{Key: "flowId", Value: fmt.Sprintf("%d", flow.ID)}}
	ctrl.Update(c)

	require.Equal(t, http.StatusUnprocessableEntity, w.Code)
	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "ERR_NODES_NOT_EXECUTABLE", body["code"])

	var row struct{ Active bool }
	db.Raw(`SELECT active FROM "Flows" WHERE id = ?`, flow.ID).Scan(&row)
	assert.False(t, row.Active, "flow não pode ativar com nó não-executável")
}

// TestFlowController_Update_AllowsActivatingExecutableFlow — guard permite ativar
// um flow cujos nós são todos executáveis (start/message/end).
func TestFlowController_Update_AllowsActivatingExecutableFlow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	nodes := `[{"id":"a","type":"start","data":{}},{"id":"b","type":"message","data":{}},{"id":"c","type":"end","data":{}}]`
	db.Exec(`INSERT INTO "Flows" (name,nodes,edges,active,"tenantId") VALUES (?,?,?,?,?)`,
		"Executavel", nodes, "[]", false, tenantID)
	var flow struct{ ID int }
	db.Raw(`SELECT id FROM "Flows" WHERE "tenantId" = ?`, tenantID).Scan(&flow)

	payload, _ := json.Marshal(map[string]interface{}{"active": true})
	ctrl := NewFlowController(nil)
	c, w := setupFlowContext(t, db, tenantID, "PUT", fmt.Sprintf("/flows/%d", flow.ID), payload)
	c.Params = gin.Params{{Key: "flowId", Value: fmt.Sprintf("%d", flow.ID)}}
	ctrl.Update(c)

	require.Equal(t, http.StatusOK, w.Code)
	var row struct{ Active bool }
	db.Raw(`SELECT active FROM "Flows" WHERE id = ?`, flow.ID).Scan(&row)
	assert.True(t, row.Active, "flow executável deve ativar")
}
