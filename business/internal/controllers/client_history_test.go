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

// TestClientController_History_ConsolidatesAcrossMultipleContacts is the
// central ADR 0023 scenario: 1 Client with 2 linked Contacts, a Ticket for
// Contact A and a Deal for Contact B — History must return BOTH, proving
// transitive consolidation without a desnormalized ClientID on Ticket/Deal.
func TestClientController_History_ConsolidatesAcrossMultipleContacts(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente Consolidado", "pf", tenantID).Error)
	var clientID int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ?`, tenantID).Scan(&clientID).Error)

	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId", "clientId") VALUES (?,?,?)`, "Contato A", tenantID, clientID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId", "clientId") VALUES (?,?,?)`, "Contato B", tenantID, clientID).Error)
	var contactIDs []int
	require.NoError(t, db.Raw(`SELECT id FROM "Contacts" WHERE "tenantId" = ? ORDER BY id`, tenantID).Scan(&contactIDs).Error)
	require.Len(t, contactIDs, 2)
	contactAID, contactBID := contactIDs[0], contactIDs[1]

	// Ticket for Contact A.
	require.NoError(t, db.Exec(
		`INSERT INTO "Tickets" (status, "contactId", "whatsappId", "tenantId") VALUES (?,?,?,?)`,
		"pending", contactAID, 0, tenantID,
	).Error)

	// Deal for Contact B — needs a Pipeline/PipelineStage FK.
	require.NoError(t, db.Exec(`INSERT INTO "Pipelines" (name, "tenantId") VALUES (?,?)`, "Funil", tenantID).Error)
	var pipelineID int
	require.NoError(t, db.Raw(`SELECT id FROM "Pipelines" WHERE "tenantId" = ?`, tenantID).Scan(&pipelineID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "PipelineStages" (name, "pipelineId") VALUES (?,?)`, "Novo", pipelineID).Error)
	var stageID int
	require.NoError(t, db.Raw(`SELECT id FROM "PipelineStages" WHERE "pipelineId" = ?`, pipelineID).Scan(&stageID).Error)

	require.NoError(t, db.Exec(
		`INSERT INTO "Deals" (name, "stageId", "contactId", "tenantId", status) VALUES (?,?,?,?,?)`,
		"Negócio B", stageID, contactBID, tenantID, "open",
	).Error)

	ctrl := NewClientController()
	c, w := setupPipelineContextWithParam(t, db, tenantID, "GET",
		"/clients/"+strconv.Itoa(clientID)+"/history", nil, "id", strconv.Itoa(clientID))

	ctrl.History(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))

	tickets, ok := resp["tickets"].([]interface{})
	require.True(t, ok, "tickets must be an array")
	require.Len(t, tickets, 1, "esperado o Ticket do Contact A")
	ticket := tickets[0].(map[string]interface{})
	assert.Equal(t, float64(contactAID), ticket["contactId"])

	deals, ok := resp["deals"].([]interface{})
	require.True(t, ok, "deals must be an array")
	require.Len(t, deals, 1, "esperado o Deal do Contact B")
	deal := deals[0].(map[string]interface{})
	assert.Equal(t, float64(contactBID), deal["contactId"])
	assert.Equal(t, "Negócio B", deal["name"])
}

// TestClientController_History_EmptyWhenNoContactsLinked asserts a Client
// with no linked Contacts returns empty tickets/deals arrays, not null/error.
func TestClientController_History_EmptyWhenNoContactsLinked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente Solo", "pf", tenantID).Error)
	var clientID int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ?`, tenantID).Scan(&clientID).Error)

	ctrl := NewClientController()
	c, w := setupPipelineContextWithParam(t, db, tenantID, "GET",
		"/clients/"+strconv.Itoa(clientID)+"/history", nil, "id", strconv.Itoa(clientID))

	ctrl.History(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))

	tickets, ok := resp["tickets"].([]interface{})
	require.True(t, ok, "tickets must be an array")
	assert.Len(t, tickets, 0)

	deals, ok := resp["deals"].([]interface{})
	require.True(t, ok, "deals must be an array")
	assert.Len(t, deals, 0)
}

// TestClientController_History_NotFound asserts a non-existent Client
// returns 404.
func TestClientController_History_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	ctrl := NewClientController()
	c, w := setupPipelineContextWithParam(t, db, tenantID, "GET",
		"/clients/9999/history", nil, "id", "9999")

	ctrl.History(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
