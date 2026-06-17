package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

type TicketController struct {
	updateTicket *usecases.UpdateTicketUseCase
	broadcast    *services.RedisBroadcast
}

func NewTicketController(ut *usecases.UpdateTicketUseCase, broadcast *services.RedisBroadcast) *TicketController {
	return &TicketController{
		updateTicket: ut,
		broadcast:    broadcast,
	}
}

// @Summary      Listar tickets
// @Tags         tickets
// @Produce      json
// @Param        status    query     string  false  "Filtro por status (open, pending, closed)"
// @Param        queueId   query     int     false  "Filtro por fila"
// @Success      200       {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /tickets [get]
func (tc *TicketController) ListTickets(c *gin.Context) {
	db, _, ok := auth.GetScoped(c, "Tickets")
	if !ok {
		return
	}
	userProfile, _ := c.Get("userProfile")

	var tickets []models.Ticket
	query := db.
		Preload("Contact").
		Preload("User").
		Order("\"updatedAt\" DESC")

	status := c.Query("status")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	searchParam := c.Query("searchParam")
	if searchParam != "" {
		query = query.Joins("JOIN \"Contacts\" ON \"Contacts\".id = \"Tickets\".\"contactId\"").
			Where("(\"Contacts\".name ILIKE ? OR \"Contacts\".number ILIKE ? OR \"Tickets\".\"lastMessage\" ILIKE ?)",
				"%"+searchParam+"%", "%"+searchParam+"%", "%"+searchParam+"%")
	}

	date := c.Query("date")
	if date != "" {
		query = query.Where("CAST(\"Tickets\".\"createdAt\" AS DATE) = ?", date)
	}

	queueIdsJson := c.Query("queueIds")
	var queueIds []int
	if queueIdsJson != "" && queueIdsJson != "null" && queueIdsJson != "[]" {
		if err := json.Unmarshal([]byte(queueIdsJson), &queueIds); err == nil && len(queueIds) > 0 {
			query = query.Where("\"Tickets\".\"queueId\" IN ?", queueIds)
		}
	}

	showAll := c.Query("showAll")
	if userProfile == "admin" && showAll == "true" {
	}

	isGroup := c.Query("isGroup")
	if isGroup == "true" {
		query = query.Where("\"Tickets\".\"isGroup\" = ?", true)
	} else if isGroup == "false" {
		query = query.Where("\"Tickets\".\"isGroup\" = ?", false)
	}

	if err := query.Find(&tickets).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListTickets")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tickets": tickets,
		"count":   len(tickets),
		"hasMore": false,
	})
}

// @Summary      Detalhar ticket
// @Tags         tickets
// @Produce      json
// @Param        ticketId  path      int  true  "ID do ticket"
// @Success      200       {object}  map[string]interface{}
// @Failure      404       {object}  map[string]string
// @Security     BearerAuth
// @Router       /tickets/{ticketId} [get]
func (tc *TicketController) ShowTicket(c *gin.Context) {
	db, _, ok := auth.GetScoped(c, "Tickets")
	if !ok {
		return
	}
	ticketID := c.Param("ticketId")

	var ticket models.Ticket
	if err := db.Where("id = ?", ticketID).
		Preload("Contact").
		Preload("User").
		First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

// @Summary      Atualizar ticket
// @Tags         tickets
// @Accept       json
// @Produce      json
// @Param        ticketId  path      int                     true  "ID do ticket"
// @Param        body      body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200       {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /tickets/{ticketId} [put]
func (tc *TicketController) UpdateTicket(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Tickets")
	if !ok {
		return
	}
	id := c.Param("ticketId")

	var ticket models.Ticket
	if err := db.Where("id = ?", id).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found or access denied"})
		return
	}

	var input struct {
		Status  string `json:"status"`
		UserID  *int   `json:"userId"`
		QueueID *int   `json:"queueId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	updateInput := usecases.UpdateTicketInput{
		TicketID: ticket.ID,
		TenantID: tenantID,
		Status:   input.Status,
		UserID:   input.UserID,
		QueueID:  input.QueueID,
	}

	if userID, exists := c.Get("userId"); exists {
		userIDInt := int(userID.(float64))
		updateInput.PerformedBy = &userIDInt
	}

	updatedTicket, err := tc.updateTicket.Execute(c.Request.Context(), updateInput)
	if err != nil {
		utils.RespondWithInternalError(c, err, "UpdateTicket")
		return
	}

	tc.broadcast.EmitToNamespace("/", "ticket", gin.H{"action": "update", "ticket": updatedTicket})
	c.JSON(http.StatusOK, updatedTicket)
}

// @Summary      Logs do ticket
// @Tags         tickets
// @Produce      json
// @Param        ticketId  path      int  true  "ID do ticket"
// @Success      200       {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /tickets/{ticketId}/logs [get]
func (tc *TicketController) ListTicketLogs(c *gin.Context) {
	db, _, ok := auth.GetScoped(c, "Tickets")
	if !ok {
		return
	}
	ticketID := c.Param("ticketId")

	var logs []models.TicketLog
	if err := db.Table("TicketLogs").
		Where("\"ticketId\" = ?", ticketID).
		Preload("User").
		Order("\"createdAt\" DESC").
		Find(&logs).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListTicketLogs")
		return
	}

	c.JSON(http.StatusOK, logs)
}
