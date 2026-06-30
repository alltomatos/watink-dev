package controllers

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/flow"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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

// runInput is the POST /flows/:id/run body. Either ticketId or contactId must be
// present; both are optional individually so we can validate the "at least one"
// invariant in the handler after binding.
type runInput struct {
	TicketID  *int `json:"ticketId"`
	ContactID *int `json:"contactId"`
}

// Run handles POST /flows/:flowId/run — start a FlowRun on demand for a ticket
// or a contact. The flow is loaded tenant-scoped; StartFlow/StartFlowForContact
// then snapshots the graph and drives the interpreter (manual WHERE "tenantId").
//
// @Summary      Iniciar flow sob demanda
// @Tags         flows
// @Accept       json
// @Produce      json
// @Param        flowId  path      int                     true  "ID do flow"
// @Param        body    body      map[string]interface{}  true  "{ticketId} or {contactId}"
// @Success      202     {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /flows/{flowId}/run [post]
func (fc *FlowController) Run(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Flows")
	if !ok {
		return
	}

	flowID := c.Param("flowId")

	var req runInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if req.TicketID == nil && req.ContactID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ticketId or contactId is required"})
		return
	}

	var f models.Flow
	if err := db.Where(`"tenantId" = ? AND id = ?`, tenantID, flowID).First(&f).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}

	// Path A: ticket-bound run (original behaviour).
	if req.TicketID != nil {
		var ticket models.Ticket
		if err := db.Preload("Contact").Where(`id = ? AND "tenantId" = ?`, *req.TicketID, tenantID).First(&ticket).Error; err != nil {
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
		if fc.runtime == nil {
			utils.RespondWithServiceError(c, http.StatusServiceUnavailable,
				errors.New("flow runtime not wired"), "Flow runtime unavailable")
			return
		}
		if err := fc.runtime.StartFlow(c.Request.Context(), in, f); err != nil {
			utils.RespondWithInternalError(c, err, "RunFlow")
			return
		}

		c.JSON(http.StatusAccepted, gin.H{"message": "Flow started", "flowId": f.ID, "ticketId": ticket.ID})
		return
	}

	// Path B: contact-bound run (subjectType=contact, no ticket).
	var contact models.Contact
	if err := db.Where(`id = ? AND "tenantId" = ?`, *req.ContactID, tenantID).First(&contact).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	}

	// Reentrance guard: reject if an active FlowRun exists for (tenant, flow, contact).
	// Contact int ID is stored in the vars JSONB as "contact_id"; SubjectID is a
	// run-local UUID (opaque). We query via Postgres JSONB operator. Use NewDB to
	// avoid accumulated conditions from the GetScoped session chain.
	var existingCount int64
	db.Session(&gorm.Session{NewDB: true}).
		Model(&models.FlowRun{}).
		Where(`"tenantId" = ? AND "flowId" = ? AND "subjectType" = ? AND vars->>'contact_id' = ? AND status IN ?`,
			tenantID, f.ID, models.FlowRunSubjectContact, fmt.Sprintf("%d", contact.ID),
			[]string{
				models.FlowRunStatusRunning,
				models.FlowRunStatusWaitingMessage,
				models.FlowRunStatusWaitingUntil,
				models.FlowRunStatusWaitingEvent,
			}).
		Count(&existingCount)
	if existingCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Contato já está neste fluxo"})
		return
	}

	domainContact := &domain.Contact{
		ID:       contact.ID,
		Name:     contact.Name,
		Number:   contact.Number,
		IsGroup:  contact.IsGroup,
		TenantID: contact.TenantID,
	}
	if fc.runtime == nil {
		utils.RespondWithServiceError(c, http.StatusServiceUnavailable,
			errors.New("flow runtime not wired"), "Flow runtime unavailable")
		return
	}
	if err := fc.runtime.StartFlowForContact(c.Request.Context(), tenantID, domainContact, f); err != nil {
		utils.RespondWithInternalError(c, err, "RunFlowForContact")
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"message": "Flow started", "flowId": f.ID, "contactId": contact.ID})
}
