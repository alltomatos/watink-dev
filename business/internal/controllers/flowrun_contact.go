package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// flowRunWithFlow is a lightweight projection of FlowRun + Flow name for the
// contact sidebar list. Avoids a JOIN/Preload by querying flows separately in
// the frontend (already loaded via GET /flows in useContactDrawer).

// ListFlowRuns handles GET /flowruns — list FlowRuns scoped to a contact.
// Query params: contactId (required), status (optional; "active" expands to all
// non-terminal statuses for convenience).
//
// @Summary      Listar FlowRuns de um contato
// @Tags         flows
// @Produce      json
// @Param        contactId  query     int     true   "ID do contato"
// @Param        status     query     string  false  "active | running | waiting_message | ..."
// @Success      200        {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /flowruns [get]
func (fc *FlowController) ListFlowRuns(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Flows")
	if !ok {
		return
	}

	contactIDStr := c.Query("contactId")
	if contactIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "contactId is required"})
		return
	}

	statusFilter := c.Query("status")

	query := db.
		Where(`"tenantId" = ? AND "subjectType" = ? AND vars->>'contact_id' = ?`,
			tenantID, models.FlowRunSubjectContact, contactIDStr)

	if statusFilter == "active" {
		query = query.Where(`status IN ?`, []string{
			models.FlowRunStatusRunning,
			models.FlowRunStatusWaitingMessage,
			models.FlowRunStatusWaitingUntil,
			models.FlowRunStatusWaitingEvent,
		})
	} else if statusFilter != "" {
		query = query.Where(`status = ?`, statusFilter)
	}

	var runs []models.FlowRun
	if err := query.Order(`"createdAt" DESC`).Find(&runs).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListFlowRuns")
		return
	}

	c.JSON(http.StatusOK, runs)
}

// AbortFlowRun handles DELETE /flowruns/:id — mark an active FlowRun as aborted.
// Only transitions non-terminal runs; returns 409 if already terminal.
//
// @Summary      Abortar FlowRun
// @Tags         flows
// @Produce      json
// @Param        id   path      string  true  "UUID do FlowRun"
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /flowruns/{id} [delete]
func (fc *FlowController) AbortFlowRun(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Flows")
	if !ok {
		return
	}

	runID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid flowrun id"})
		return
	}

	res := db.Session(&gorm.Session{NewDB: true}).
		Model(&models.FlowRun{}).
		Where(`id = ? AND "tenantId" = ? AND status IN ?`,
			runID, tenantID,
			[]string{
				models.FlowRunStatusRunning,
				models.FlowRunStatusWaitingMessage,
				models.FlowRunStatusWaitingUntil,
				models.FlowRunStatusWaitingEvent,
			}).
		Updates(map[string]interface{}{"status": models.FlowRunStatusAborted})

	if res.Error != nil {
		utils.RespondWithInternalError(c, res.Error, "AbortFlowRun")
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "FlowRun not found or already terminal"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "FlowRun aborted"})
}
