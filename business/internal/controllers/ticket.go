package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/gin-gonic/gin"
)

type TicketController struct {
	updateTicket *usecases.UpdateTicketUseCase
}

func NewTicketController(ut *usecases.UpdateTicketUseCase) *TicketController {
	return &TicketController{updateTicket: ut}
}

func (tc *TicketController) ListTickets(c *gin.Context) {
	userProfile, _ := c.Get("userProfile")

	var tickets []models.Ticket
	query := getScopedDB(c, "Tickets").
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tickets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tickets": tickets,
		"count":   len(tickets),
		"hasMore": false,
	})
}

func (tc *TicketController) ShowTicket(c *gin.Context) {
	ticketID := c.Param("ticketId")

	var ticket models.Ticket
	if err := getScopedDB(c, "Tickets").Where("id = ?", ticketID).
		Preload("Contact").
		Preload("User").
		First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

func (tc *TicketController) UpdateTicket(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("ticketId")

	var ticket models.Ticket
	if err := getScopedDB(c, "Tickets").Where("id = ?", id).First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found or access denied"})
		return
	}

	var input struct {
		Status  string `json:"status"`
		UserID  *int   `json:"userId"`
		QueueID *int   `json:"queueId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket"})
		return
	}

	services.EmitToNamespace("/", "ticket", gin.H{"action": "update", "ticket": updatedTicket})
	c.JSON(http.StatusOK, updatedTicket)
}

func (tc *TicketController) ListTicketLogs(c *gin.Context) {
	ticketID := c.Param("ticketId")

	var logs []models.TicketLog
	if err := getScopedDB(c, "Tickets").Table("TicketLogs").
		Where("\"ticketId\" = ?", ticketID).
		Preload("User").
		Order("\"createdAt\" DESC").
		Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch logs"})
		return
	}

	c.JSON(http.StatusOK, logs)
}
