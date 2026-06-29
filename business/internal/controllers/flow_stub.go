package controllers

import (
	"errors"
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/flow"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

// Simulate handles POST /flows/:id/simulate — dry-run the graph in no-op mode and
// return the simulated trail. Not implemented in FASE 0 (no node execution this
// phase); returns 501 with the canonical error body.
//
// @Summary      Simular flow (não implementado)
// @Tags         flows
// @Produce      json
// @Param        flowId  path      int  true  "ID do flow"
// @Success      501     {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /flows/{flowId}/simulate [post]
func (fc *FlowController) Simulate(c *gin.Context) {
	if _, _, ok := auth.GetScoped(c, "Flows"); !ok {
		return
	}
	utils.RespondWithServiceError(c, http.StatusNotImplemented,
		errors.New("flows simulate not implemented"),
		"Flow simulation is not implemented yet")
}

// runInput is the POST /flows/:id/run body: which ticket to bind the run to.
type runInput struct {
	TicketID int `json:"ticketId" binding:"required"`
}

// Run handles POST /flows/:flowId/run — start a FlowRun on demand for a ticket.
// Useful to test a flow without waiting for a matching inbound. The flow and the
// ticket (with its contact) are loaded tenant-scoped; StartFlow then snapshots
// the graph and drives the interpreter (manual WHERE "tenantId").
//
// @Summary      Iniciar flow sob demanda
// @Tags         flows
// @Accept       json
// @Produce      json
// @Param        flowId  path      int                     true  "ID do flow"
// @Param        body    body      map[string]interface{}  true  "{ticketId}"
// @Success      202     {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /flows/{flowId}/run [post]
func (fc *FlowController) Run(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Flows")
	if !ok {
		return
	}
	if fc.runtime == nil {
		utils.RespondWithServiceError(c, http.StatusServiceUnavailable,
			errors.New("flow runtime not wired"), "Flow runtime unavailable")
		return
	}

	flowID := c.Param("flowId")

	var req runInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	var f models.Flow
	if err := db.Where(`"tenantId" = ? AND id = ?`, tenantID, flowID).First(&f).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}

	var ticket models.Ticket
	if err := db.Preload("Contact").Where(`id = ? AND "tenantId" = ?`, req.TicketID, tenantID).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	domainTicket := &domain.Ticket{
		ID:         ticket.ID,
		Status:     ticket.Status,
		ContactID:  ticket.ContactID,
		WhatsappID: ticket.WhatsappID,
		IsGroup:    ticket.IsGroup,
		TenantID:   ticket.TenantID,
	}
	domainContact := &domain.Contact{
		ID:       ticket.Contact.ID,
		Name:     ticket.Contact.Name,
		Number:   ticket.Contact.Number,
		IsGroup:  ticket.Contact.IsGroup,
		Lid:      ticket.Contact.Lid,
		TenantID: ticket.Contact.TenantID,
	}

	in := flow.InboundContext{
		TenantID: tenantID,
		Ticket:   domainTicket,
		Contact:  domainContact,
	}
	if err := fc.runtime.StartFlow(c.Request.Context(), in, f); err != nil {
		utils.RespondWithInternalError(c, err, "RunFlow")
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"message": "Flow started", "flowId": f.ID, "ticketId": ticket.ID})
}
