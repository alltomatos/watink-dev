package controllers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDealController_List_MissingPipelineId verifica que omitir pipelineId retorna 400.
func TestDealController_List_MissingPipelineId(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	ctrl := NewDealController()
	c, w := setupPipelineContext(t, db, tenantID, "GET", "/deals", nil)

	ctrl.List(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Contains(t, resp["error"], "required")
}

// TestDealController_List_Empty verifica que pipelineId válido sem deals retorna 200 com lista vazia.
func TestDealController_List_Empty(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	// Seed pipeline with one stage but no deals
	require.NoError(t, db.Exec(`INSERT INTO "Pipelines" (name, "tenantId") VALUES (?,?)`, "Funil", tenantID).Error)
	var pipelineID int
	require.NoError(t, db.Raw(`SELECT id FROM "Pipelines" WHERE "tenantId" = ?`, tenantID).Scan(&pipelineID).Error)

	require.NoError(t, db.Exec(`INSERT INTO "PipelineStages" (name, "pipelineId") VALUES (?,?)`, "Novo", pipelineID).Error)

	ctrl := NewDealController()
	c, w := setupPipelineContext(t, db, tenantID, "GET", "/deals?pipelineId="+strconv.Itoa(pipelineID), nil)
	c.Request.URL.RawQuery = "pipelineId=" + strconv.Itoa(pipelineID)

	ctrl.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	deals, ok := resp["deals"].([]interface{})
	require.True(t, ok, "deals must be an array")
	assert.Len(t, deals, 0)
}

// TestDealController_List_WithDeals verifica que deals vinculados ao pipeline são retornados.
func TestDealController_List_WithDeals(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	// Seed pipeline + stage
	require.NoError(t, db.Exec(`INSERT INTO "Pipelines" (name, "tenantId") VALUES (?,?)`, "Funil", tenantID).Error)
	var pipelineID int
	require.NoError(t, db.Raw(`SELECT id FROM "Pipelines" WHERE "tenantId" = ?`, tenantID).Scan(&pipelineID).Error)

	require.NoError(t, db.Exec(`INSERT INTO "PipelineStages" (name, "pipelineId") VALUES (?,?)`, "Aberto", pipelineID).Error)
	var stageID int
	require.NoError(t, db.Raw(`SELECT id FROM "PipelineStages" WHERE "pipelineId" = ?`, pipelineID).Scan(&stageID).Error)

	// Seed contact (required FK for deal)
	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId") VALUES (?,?)`, "João", tenantID).Error)
	var contactID int
	require.NoError(t, db.Raw(`SELECT id FROM "Contacts" WHERE "tenantId" = ?`, tenantID).Scan(&contactID).Error)

	// Seed deal
	require.NoError(t, db.Exec(
		`INSERT INTO "Deals" (name, "stageId", "contactId", "tenantId", status) VALUES (?,?,?,?,?)`,
		"Deal Teste", stageID, contactID, tenantID, "open",
	).Error)

	ctrl := NewDealController()
	c, w := setupPipelineContext(t, db, tenantID, "GET", "/deals", nil)
	c.Request.URL.RawQuery = "pipelineId=" + strconv.Itoa(pipelineID)

	ctrl.List(c)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	deals, ok := resp["deals"].([]interface{})
	require.True(t, ok, "deals must be an array")
	assert.Len(t, deals, 1)
	deal := deals[0].(map[string]interface{})
	assert.Equal(t, "Deal Teste", deal["name"])
}

// TestDealController_Update_NotFound verifica que deal inexistente retorna 404.
func TestDealController_Update_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	payload, _ := json.Marshal(map[string]interface{}{"stageId": 1})
	ctrl := NewDealController()
	c, w := setupPipelineContextWithParam(t, db, tenantID, "PUT", "/deals/9999", payload, "id", "9999")

	ctrl.Update(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// TestDealController_Update_MovesStage verifica que um deal existente tem seu stageId atualizado.
func TestDealController_Update_MovesStage(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	// Seed pipeline + 2 stages
	require.NoError(t, db.Exec(`INSERT INTO "Pipelines" (name, "tenantId") VALUES (?,?)`, "Funil", tenantID).Error)
	var pipelineID int
	require.NoError(t, db.Raw(`SELECT id FROM "Pipelines" WHERE "tenantId" = ?`, tenantID).Scan(&pipelineID).Error)

	require.NoError(t, db.Exec(`INSERT INTO "PipelineStages" (name, "pipelineId") VALUES (?,?)`, "Aberto", pipelineID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "PipelineStages" (name, "pipelineId") VALUES (?,?)`, "Fechado", pipelineID).Error)
	var stageIDs []int
	require.NoError(t, db.Raw(`SELECT id FROM "PipelineStages" WHERE "pipelineId" = ? ORDER BY id`, pipelineID).Scan(&stageIDs).Error)
	require.Len(t, stageIDs, 2)
	stage1ID, stage2ID := stageIDs[0], stageIDs[1]

	// Seed contact
	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId") VALUES (?,?)`, "Maria", tenantID).Error)
	var contactID int
	require.NoError(t, db.Raw(`SELECT id FROM "Contacts" WHERE "tenantId" = ?`, tenantID).Scan(&contactID).Error)

	// Seed deal in stage1
	require.NoError(t, db.Exec(
		`INSERT INTO "Deals" (name, "stageId", "contactId", "tenantId", status) VALUES (?,?,?,?,?)`,
		"Deal Move", stage1ID, contactID, tenantID, "open",
	).Error)
	var dealID int
	require.NoError(t, db.Raw(`SELECT id FROM "Deals" WHERE "tenantId" = ?`, tenantID).Scan(&dealID).Error)

	// Move to stage2
	payload, _ := json.Marshal(map[string]interface{}{"stageId": stage2ID})
	ctrl := NewDealController()
	c, w := setupPipelineContextWithParam(t, db, tenantID, "PUT", "/deals/"+strconv.Itoa(dealID), payload, "id", strconv.Itoa(dealID))

	ctrl.Update(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())
	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, float64(stage2ID), resp["stageId"])
}

// TestDealController_Create_RejectsCrossTenantRefs verifica que Create recusa um
// stageId/contactId de OUTRO tenant (vazamento cross-tenant — achado P2-1).
func TestDealController_Create_RejectsCrossTenantRefs(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	// tenant B owns a pipeline+stage and a contact
	require.NoError(t, db.Exec(`INSERT INTO "Pipelines" (name, "tenantId") VALUES (?,?)`, "B-Funil", tenantB).Error)
	var bPipelineID int
	require.NoError(t, db.Raw(`SELECT id FROM "Pipelines" WHERE "tenantId" = ?`, tenantB).Scan(&bPipelineID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "PipelineStages" (name, "pipelineId") VALUES (?,?)`, "B-Stage", bPipelineID).Error)
	var bStageID int
	require.NoError(t, db.Raw(`SELECT id FROM "PipelineStages" WHERE "pipelineId" = ?`, bPipelineID).Scan(&bStageID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId") VALUES (?,?)`, "B-Contact", tenantB).Error)
	var bContactID int
	require.NoError(t, db.Raw(`SELECT id FROM "Contacts" WHERE "tenantId" = ?`, tenantB).Scan(&bContactID).Error)

	// tenant A tries to create a deal pointing at B's stage/contact → 400
	payload, _ := json.Marshal(map[string]interface{}{
		"name": "Roubado", "stageId": bStageID, "contactId": bContactID,
	})
	ctrl := NewDealController()
	c, w := setupPipelineContext(t, db, tenantA, "POST", "/deals", payload)
	ctrl.Create(c)
	assert.Equal(t, http.StatusBadRequest, w.Code, "cross-tenant stageId must be rejected; body: %s", w.Body.String())
}

// TestDealController_Create_OwnRefs_Succeeds garante que o happy-path (stage e
// contact do próprio tenant) continua criando o deal (201).
func TestDealController_Create_OwnRefs_Succeeds(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Pipelines" (name, "tenantId") VALUES (?,?)`, "Funil", tenantID).Error)
	var pipelineID int
	require.NoError(t, db.Raw(`SELECT id FROM "Pipelines" WHERE "tenantId" = ?`, tenantID).Scan(&pipelineID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "PipelineStages" (name, "pipelineId") VALUES (?,?)`, "Aberto", pipelineID).Error)
	var stageID int
	require.NoError(t, db.Raw(`SELECT id FROM "PipelineStages" WHERE "pipelineId" = ?`, pipelineID).Scan(&stageID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId") VALUES (?,?)`, "Cliente", tenantID).Error)
	var contactID int
	require.NoError(t, db.Raw(`SELECT id FROM "Contacts" WHERE "tenantId" = ?`, tenantID).Scan(&contactID).Error)

	payload, _ := json.Marshal(map[string]interface{}{
		"name": "Negócio", "stageId": stageID, "contactId": contactID,
	})
	ctrl := NewDealController()
	c, w := setupPipelineContext(t, db, tenantID, "POST", "/deals", payload)
	ctrl.Create(c)
	assert.Equal(t, http.StatusCreated, w.Code, "own-tenant refs must succeed; body: %s", w.Body.String())
}
