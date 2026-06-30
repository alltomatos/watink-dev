package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestFlowRunContact_List asserts that GET /flowruns?contactId=X returns only
// the runs belonging to that contact in the caller's tenant.
func TestFlowRunContact_List(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	contactID := 42
	otherContactID := 99

	// seed two runs for contactID and one for another contact
	now := time.Now()
	expires := now.Add(24 * time.Hour)
	sid := uuid.New()
	for i, cid := range []int{contactID, contactID, otherContactID} {
		db.Exec(`INSERT INTO "FlowRuns"
			(id,"tenantId","flowId",status,"subjectType","subjectId",vars,"expiresAt","graphSnapshot","createdAt","updatedAt")
			VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
			uuid.New(), tenantID, i+1,
			models.FlowRunStatusWaitingMessage,
			models.FlowRunSubjectContact, sid,
			fmt.Sprintf(`{"contact_id":"%d"}`, cid),
			expires, `{}`, now, now,
		)
	}

	c, w := setupFlowContext(t, db, tenantID, http.MethodGet,
		fmt.Sprintf("/flowruns?contactId=%d", contactID), nil)
	c.Request.URL.RawQuery = fmt.Sprintf("contactId=%d&status=active", contactID)

	fc := NewFlowController(nil)
	fc.ListFlowRuns(c)

	require.Equal(t, http.StatusOK, w.Code)
	var got []models.FlowRun
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	assert.Len(t, got, 2, "should return only runs for the requested contact")
}

// TestFlowRunContact_Start_ConflictOnReentrance asserts that POST /flows/:id/run
// with contactId returns 409 when an active run already exists for that contact+flow.
func TestFlowRunContact_Start_ConflictOnReentrance(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	// seed a flow and capture its auto-generated id
	db.Exec(`INSERT INTO "Flows" (name,"tenantId",active) VALUES (?,?,?)`,
		"TestFlow", tenantID, true)
	var flowID int
	db.Raw(`SELECT id FROM "Flows" WHERE "tenantId" = ? ORDER BY id DESC LIMIT 1`, tenantID).Scan(&flowID)
	require.NotZero(t, flowID)

	// seed a contact and capture the real auto-generated id
	contact := models.Contact{
		Name:     "TestContact",
		Number:   "5511999999999",
		TenantID: tenantID,
	}
	require.NoError(t, db.Create(&contact).Error)
	contactID := contact.ID
	require.NotZero(t, contactID)

	now := time.Now()
	expires := now.Add(24 * time.Hour)
	sid := uuid.New()
	db.Exec(`INSERT INTO "FlowRuns"
		(id,"tenantId","flowId",status,"subjectType","subjectId",vars,"expiresAt","graphSnapshot","createdAt","updatedAt")
		VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		uuid.New(), tenantID, flowID,
		models.FlowRunStatusWaitingMessage,
		models.FlowRunSubjectContact, sid,
		fmt.Sprintf(`{"contact_id":"%d"}`, contactID),
		expires, `{}`, now, now,
	)

	body, _ := json.Marshal(map[string]int{"contactId": contactID})
	c, w := setupFlowContext(t, db, tenantID, http.MethodPost,
		fmt.Sprintf("/flows/%d/run", flowID), body)
	c.AddParam("flowId", fmt.Sprintf("%d", flowID))

	fc := NewFlowController(nil) // runtime=nil: reentrance guard fires before runtime call
	fc.Run(c)

	assert.Equal(t, http.StatusConflict, w.Code)
}

// TestFlowRunContact_Abort asserts that DELETE /flowruns/:id transitions an active
// run to aborted and returns 200.
func TestFlowRunContact_Abort(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupFlowTestDB(t)
	tenantID := uuid.New()

	runID := uuid.New()
	now := time.Now()
	expires := now.Add(24 * time.Hour)
	sid := uuid.New()
	db.Exec(`INSERT INTO "FlowRuns"
		(id,"tenantId","flowId",status,"subjectType","subjectId",vars,"expiresAt","graphSnapshot","createdAt","updatedAt")
		VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		runID, tenantID, 1,
		models.FlowRunStatusWaitingMessage,
		models.FlowRunSubjectContact, sid,
		`{"contact_id":"5"}`,
		expires, `{}`, now, now,
	)

	c, w := setupFlowContext(t, db, tenantID, http.MethodDelete,
		fmt.Sprintf("/flowruns/%s", runID), nil)
	c.AddParam("id", runID.String())

	fc := NewFlowController(nil)
	fc.AbortFlowRun(c)

	require.Equal(t, http.StatusOK, w.Code)

	var run models.FlowRun
	db.Where("id = ?", runID).First(&run)
	assert.Equal(t, models.FlowRunStatusAborted, run.Status)
}
