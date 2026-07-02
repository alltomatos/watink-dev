package controllers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestClientController_CreateAddress_Success creates an address under a
// Client — must return 201 with the address persisted and clientId correct.
//
// Note on geocoding: services.Geocode makes a real HTTP call to
// nominatim.openstreetmap.org with a 5s timeout. This test does NOT assert
// on Latitude/Longitude (unreliable to test without a network mock, out of
// scope here) — it only asserts the create+response contract, and that the
// handler returns promptly (best-effort geocoding must never block).
func TestClientController_CreateAddress_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente A", "pf", tenantID).Error)
	var clientID int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ?`, tenantID).Scan(&clientID).Error)

	payload, _ := json.Marshal(map[string]interface{}{
		"label":        "Casa",
		"zipCode":      "01310-000",
		"street":       "Av. Paulista",
		"number":       "1000",
		"neighborhood": "Bela Vista",
		"city":         "São Paulo",
		"state":        "SP",
		"isPrimary":    true,
	})

	ctrl := NewClientController()
	c, w := setupPipelineContextWithParam(t, db, tenantID, "POST",
		"/clients/"+strconv.Itoa(clientID)+"/addresses", payload, "id", strconv.Itoa(clientID))

	runWithTimeout(t, func() { ctrl.CreateAddress(c) })

	assert.Equal(t, http.StatusCreated, w.Code, "body: %s", w.Body.String())

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, float64(clientID), resp["clientId"])
	assert.Equal(t, "Casa", resp["label"])
	assert.Equal(t, "Av. Paulista", resp["street"])

	var count int64
	require.NoError(t, db.Raw(`SELECT COUNT(*) FROM "ClientAddresses" WHERE "clientId" = ?`, clientID).Scan(&count).Error)
	assert.Equal(t, int64(1), count)
}

// TestClientController_CreateAddress_IsPrimaryExclusive creates address A as
// primary, then address B also as primary under the same Client — only B may
// remain primary afterwards.
func TestClientController_CreateAddress_IsPrimaryExclusive(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente A", "pf", tenantID).Error)
	var clientID int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ?`, tenantID).Scan(&clientID).Error)

	ctrl := NewClientController()

	payloadA, _ := json.Marshal(map[string]interface{}{
		"label": "Endereço A", "street": "Rua A", "isPrimary": true,
	})
	cA, wA := setupPipelineContextWithParam(t, db, tenantID, "POST",
		"/clients/"+strconv.Itoa(clientID)+"/addresses", payloadA, "id", strconv.Itoa(clientID))
	runWithTimeout(t, func() { ctrl.CreateAddress(cA) })
	require.Equal(t, http.StatusCreated, wA.Code, "body: %s", wA.Body.String())

	payloadB, _ := json.Marshal(map[string]interface{}{
		"label": "Endereço B", "street": "Rua B", "isPrimary": true,
	})
	cB, wB := setupPipelineContextWithParam(t, db, tenantID, "POST",
		"/clients/"+strconv.Itoa(clientID)+"/addresses", payloadB, "id", strconv.Itoa(clientID))
	runWithTimeout(t, func() { ctrl.CreateAddress(cB) })
	require.Equal(t, http.StatusCreated, wB.Code, "body: %s", wB.Body.String())

	type primaryRow struct {
		Label     string
		IsPrimary bool
	}
	var rows []primaryRow
	require.NoError(t, db.Raw(`SELECT label AS label, "isPrimary" AS is_primary FROM "ClientAddresses" WHERE "clientId" = ? ORDER BY id`, clientID).Scan(&rows).Error)
	require.Len(t, rows, 2)
	assert.False(t, rows[0].IsPrimary, "endereço A não deveria mais ser primary")
	assert.True(t, rows[1].IsPrimary, "endereço B deveria ser o único primary")
}

// TestClientController_DeleteAddress_Success creates then deletes an address
// — ClientAddress has NO soft-delete contract (unlike Client), so the row
// must be gone for good (docs/agents/clients.md: "Delete: sempre soft-delete
// (DeletedAt)" applies to Client only; client_address.go's DeleteAddress
// comment confirms ClientAddress hard-deletes).
func TestClientController_DeleteAddress_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente A", "pf", tenantID).Error)
	var clientID int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ?`, tenantID).Scan(&clientID).Error)

	require.NoError(t, db.Exec(
		`INSERT INTO "ClientAddresses" ("clientId", "tenantId", label, street) VALUES (?,?,?,?)`,
		clientID, tenantID, "Casa", "Rua X",
	).Error)
	var addressID int
	require.NoError(t, db.Raw(`SELECT id FROM "ClientAddresses" WHERE "clientId" = ?`, clientID).Scan(&addressID).Error)

	ctrl := NewClientController()
	c, w := setupPipelineContextWith2Params(t, db, tenantID, "DELETE",
		"/clients/"+strconv.Itoa(clientID)+"/addresses/"+strconv.Itoa(addressID), nil,
		"id", strconv.Itoa(clientID), "addressId", strconv.Itoa(addressID))

	ctrl.DeleteAddress(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	var count int64
	require.NoError(t, db.Raw(`SELECT COUNT(*) FROM "ClientAddresses" WHERE id = ?`, addressID).Scan(&count).Error)
	assert.Equal(t, int64(0), count, "ClientAddress deve ser hard-deleted (sem DeletedAt)")
}

// TestClientController_ListAddresses_ReturnsOnlyOwnClient seeds 2 Clients,
// each with 1 address — ListAddresses for Client A must return only its own.
func TestClientController_ListAddresses_ReturnsOnlyOwnClient(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente A", "pf", tenantID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente B", "pf", tenantID).Error)
	var clientIDs []int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ? ORDER BY id`, tenantID).Scan(&clientIDs).Error)
	require.Len(t, clientIDs, 2)
	clientAID, clientBID := clientIDs[0], clientIDs[1]

	require.NoError(t, db.Exec(
		`INSERT INTO "ClientAddresses" ("clientId", "tenantId", label, street) VALUES (?,?,?,?)`,
		clientAID, tenantID, "Endereço A", "Rua A",
	).Error)
	require.NoError(t, db.Exec(
		`INSERT INTO "ClientAddresses" ("clientId", "tenantId", label, street) VALUES (?,?,?,?)`,
		clientBID, tenantID, "Endereço B", "Rua B",
	).Error)

	ctrl := NewClientController()
	c, w := setupPipelineContextWithParam(t, db, tenantID, "GET",
		"/clients/"+strconv.Itoa(clientAID)+"/addresses", nil, "id", strconv.Itoa(clientAID))

	ctrl.ListAddresses(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	addresses, ok := resp["addresses"].([]interface{})
	require.True(t, ok, "addresses must be an array")
	require.Len(t, addresses, 1)
	addr := addresses[0].(map[string]interface{})
	assert.Equal(t, "Endereço A", addr["label"])
	assert.Equal(t, float64(clientAID), addr["clientId"])
}

// runWithTimeout runs fn and fails the test if it doesn't return within 15s
// — guards against best-effort geocoding (Nominatim HTTP call) blocking a
// handler indefinitely instead of respecting its own 5s client timeout.
func runWithTimeout(t *testing.T, fn func()) {
	t.Helper()
	done := make(chan struct{})
	go func() {
		fn()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(15 * time.Second):
		t.Fatal("handler did not return within 15s — best-effort geocoding must never block the response")
	}
}
