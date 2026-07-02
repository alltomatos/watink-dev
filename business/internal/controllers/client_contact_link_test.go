package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// setupPipelineContextWith2Params builds a gin.Context/Recorder pair with TWO
// path params — LinkContact/UnlinkContact routes on :id AND :contactId,
// which setupPipelineContextWithParam (pipeline_test.go) doesn't support.
// Delegates to setupPipelineContext for everything else (tenant/db/request).
func setupPipelineContextWith2Params(t *testing.T, db *gorm.DB, tenantID uuid.UUID, method, path string, body []byte, key1, val1, key2, val2 string) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	c, w := setupPipelineContext(t, db, tenantID, method, path, body)
	c.Params = gin.Params{{Key: key1, Value: val1}, {Key: key2, Value: val2}}
	return c, w
}

// TestClientController_LinkContact_Success links a bare Contact (no ClientID
// yet) to a Client without confirmReassign — must succeed and persist
// Contacts.clientId.
func TestClientController_LinkContact_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente A", "pf", tenantID).Error)
	var clientID int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ?`, tenantID).Scan(&clientID).Error)

	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId") VALUES (?,?)`, "Fulano", tenantID).Error)
	var contactID int
	require.NoError(t, db.Raw(`SELECT id FROM "Contacts" WHERE "tenantId" = ?`, tenantID).Scan(&contactID).Error)

	ctrl := NewClientController()
	c, w := setupPipelineContextWith2Params(t, db, tenantID, "POST",
		"/clients/"+strconv.Itoa(clientID)+"/contacts/"+strconv.Itoa(contactID), nil,
		"id", strconv.Itoa(clientID), "contactId", strconv.Itoa(contactID))

	ctrl.LinkContact(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	var gotClientID *int
	require.NoError(t, db.Raw(`SELECT "clientId" FROM "Contacts" WHERE id = ?`, contactID).Scan(&gotClientID).Error)
	require.NotNil(t, gotClientID)
	assert.Equal(t, clientID, *gotClientID)
}

// TestClientController_LinkContact_RequiresConfirmationWhenAlreadyLinked
// tries to move a Contact already linked to Client A over to Client B
// without confirmReassign — must be rejected with 409 and enough context for
// the frontend confirmation dialog (ADR 0023).
func TestClientController_LinkContact_RequiresConfirmationWhenAlreadyLinked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente A", "pf", tenantID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente B", "pf", tenantID).Error)
	var clientIDs []int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ? ORDER BY id`, tenantID).Scan(&clientIDs).Error)
	require.Len(t, clientIDs, 2)
	clientAID, clientBID := clientIDs[0], clientIDs[1]

	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId", "clientId") VALUES (?,?,?)`, "Fulano", tenantID, clientAID).Error)
	var contactID int
	require.NoError(t, db.Raw(`SELECT id FROM "Contacts" WHERE "tenantId" = ?`, tenantID).Scan(&contactID).Error)

	ctrl := NewClientController()
	c, w := setupPipelineContextWith2Params(t, db, tenantID, "POST",
		"/clients/"+strconv.Itoa(clientBID)+"/contacts/"+strconv.Itoa(contactID), nil,
		"id", strconv.Itoa(clientBID), "contactId", strconv.Itoa(contactID))

	ctrl.LinkContact(c)

	assert.Equal(t, http.StatusConflict, w.Code, "body: %s", w.Body.String())

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, true, resp["requiresConfirmation"])
	assert.Equal(t, float64(clientAID), resp["currentClientId"])

	// The link must NOT have moved.
	var gotClientID *int
	require.NoError(t, db.Raw(`SELECT "clientId" FROM "Contacts" WHERE id = ?`, contactID).Scan(&gotClientID).Error)
	require.NotNil(t, gotClientID)
	assert.Equal(t, clientAID, *gotClientID)
}

// TestClientController_LinkContact_ReassignsWithConfirmation is the same
// scenario as above but WITH confirmReassign=true — the move must succeed.
func TestClientController_LinkContact_ReassignsWithConfirmation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente A", "pf", tenantID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente B", "pf", tenantID).Error)
	var clientIDs []int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ? ORDER BY id`, tenantID).Scan(&clientIDs).Error)
	require.Len(t, clientIDs, 2)
	clientAID, clientBID := clientIDs[0], clientIDs[1]

	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId", "clientId") VALUES (?,?,?)`, "Fulano", tenantID, clientAID).Error)
	var contactID int
	require.NoError(t, db.Raw(`SELECT id FROM "Contacts" WHERE "tenantId" = ?`, tenantID).Scan(&contactID).Error)

	body, _ := json.Marshal(map[string]interface{}{"confirmReassign": true})
	ctrl := NewClientController()
	c, w := setupPipelineContextWith2Params(t, db, tenantID, "POST",
		"/clients/"+strconv.Itoa(clientBID)+"/contacts/"+strconv.Itoa(contactID), body,
		"id", strconv.Itoa(clientBID), "contactId", strconv.Itoa(contactID))

	ctrl.LinkContact(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	var gotClientID *int
	require.NoError(t, db.Raw(`SELECT "clientId" FROM "Contacts" WHERE id = ?`, contactID).Scan(&gotClientID).Error)
	require.NotNil(t, gotClientID)
	assert.Equal(t, clientBID, *gotClientID)
}

// TestClientController_UnlinkContact_Success unlinks a Contact currently
// pointing to the given Client — Contacts.clientId must become NULL.
func TestClientController_UnlinkContact_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente A", "pf", tenantID).Error)
	var clientID int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ?`, tenantID).Scan(&clientID).Error)

	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId", "clientId") VALUES (?,?,?)`, "Fulano", tenantID, clientID).Error)
	var contactID int
	require.NoError(t, db.Raw(`SELECT id FROM "Contacts" WHERE "tenantId" = ?`, tenantID).Scan(&contactID).Error)

	ctrl := NewClientController()
	c, w := setupPipelineContextWith2Params(t, db, tenantID, "DELETE",
		"/clients/"+strconv.Itoa(clientID)+"/contacts/"+strconv.Itoa(contactID), nil,
		"id", strconv.Itoa(clientID), "contactId", strconv.Itoa(contactID))

	ctrl.UnlinkContact(c)

	assert.Equal(t, http.StatusOK, w.Code, "body: %s", w.Body.String())

	var gotClientID *int
	require.NoError(t, db.Raw(`SELECT "clientId" FROM "Contacts" WHERE id = ?`, contactID).Scan(&gotClientID).Error)
	assert.Nil(t, gotClientID)
}

// TestClientController_UnlinkContact_RejectsWhenNotLinkedToThisClient tries
// to unlink a Contact from Client B when it's actually linked to Client A —
// must be rejected 400 and leave the link untouched.
func TestClientController_UnlinkContact_RejectsWhenNotLinkedToThisClient(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupPipelineTestDB(t)
	tenantID := uuid.New()

	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente A", "pf", tenantID).Error)
	require.NoError(t, db.Exec(`INSERT INTO "Clients" (name, type, "tenantId") VALUES (?,?,?)`, "Cliente B", "pf", tenantID).Error)
	var clientIDs []int
	require.NoError(t, db.Raw(`SELECT id FROM "Clients" WHERE "tenantId" = ? ORDER BY id`, tenantID).Scan(&clientIDs).Error)
	require.Len(t, clientIDs, 2)
	clientAID, clientBID := clientIDs[0], clientIDs[1]

	require.NoError(t, db.Exec(`INSERT INTO "Contacts" (name, "tenantId", "clientId") VALUES (?,?,?)`, "Fulano", tenantID, clientAID).Error)
	var contactID int
	require.NoError(t, db.Raw(`SELECT id FROM "Contacts" WHERE "tenantId" = ?`, tenantID).Scan(&contactID).Error)

	ctrl := NewClientController()
	c, w := setupPipelineContextWith2Params(t, db, tenantID, "DELETE",
		"/clients/"+strconv.Itoa(clientBID)+"/contacts/"+strconv.Itoa(contactID), nil,
		"id", strconv.Itoa(clientBID), "contactId", strconv.Itoa(contactID))

	ctrl.UnlinkContact(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "body: %s", w.Body.String())

	var gotClientID *int
	require.NoError(t, db.Raw(`SELECT "clientId" FROM "Contacts" WHERE id = ?`, contactID).Scan(&gotClientID).Error)
	require.NotNil(t, gotClientID)
	assert.Equal(t, clientAID, *gotClientID)
}
