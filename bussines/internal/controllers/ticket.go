package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/alltomatos/watinkdev/bussines/internal/services"
	"github.com/gin-gonic/gin"
)

func ListTickets(c *gin.Context) {
	userProfile, _ := c.Get("userProfile")

	var tickets []models.Ticket
	// Start with scoped DB based on profile
	query := getScopedDB(c, "Tickets").
		Preload("Contact").
		Order("\"updatedAt\" DESC")

	// Filter by status if provided
	status := c.Query("status")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by searchParam
	searchParam := c.Query("searchParam")
	if searchParam != "" {
		query = query.Joins("JOIN \"Contacts\" ON \"Contacts\".id = \"Tickets\".\"contactId\"").
			Where("(\"Contacts\".name ILIKE ? OR \"Contacts\".number ILIKE ? OR \"Tickets\".\"lastMessage\" ILIKE ?)", 
				"%"+searchParam+"%", "%"+searchParam+"%", "%"+searchParam+"%")
	}

	// Filter by date if provided
	date := c.Query("date")
	if date != "" {
		query = query.Where("CAST(\"Tickets\".\"createdAt\" AS DATE) = ?", date)
	}

	// Handle Queue IDs
	queueIdsJson := c.Query("queueIds")
	var queueIds []int
	if queueIdsJson != "" && queueIdsJson != "null" && queueIdsJson != "[]" {
		if err := json.Unmarshal([]byte(queueIdsJson), &queueIds); err == nil && len(queueIds) > 0 {
			query = query.Where("\"Tickets\".\"queueId\" IN ?", queueIds)
		}
	}

	// Handle showAll for admins
	showAll := c.Query("showAll")
	if userProfile == "admin" && showAll == "true" {
		// Admins see everything, including null queues (already handled by getScopedDB)
	}

	// Filter by isGroup
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
		"hasMore": false, // Pagination not implemented yet
	})
}

func ShowTicket(c *gin.Context) {
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

func UpdateTicket(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("ticketId")

	// Use getScopedDB to ensure the user has permission to update this ticket
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

	oldQueueID := ticket.QueueID
	oldUserID := ticket.UserID
	oldStatus := ticket.Status
	
	if input.Status != "" {
		ticket.Status = input.Status
	}
	ticket.UserID = input.UserID
	ticket.QueueID = input.QueueID

	if err := database.DB.Save(&ticket).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update ticket"})
		return
	}

	// Logging
	ctxUserID, _ := c.Get("userId")
	userIDInt := int(ctxUserID.(float64))
	
	if input.Status != "" && input.Status != oldStatus {
		services.CreateTicketLog(ticket.ID, &userIDInt, "status", map[string]interface{}{"old": oldStatus, "new": input.Status})
	}
	if input.QueueID != nil && (oldQueueID == nil || *oldQueueID != *input.QueueID) {
		services.CreateTicketLog(ticket.ID, &userIDInt, "transfer", map[string]interface{}{"oldQueueId": oldQueueID, "newQueueId": input.QueueID})
	}
	if input.UserID != nil && (oldUserID == nil || *oldUserID != *input.UserID) {
		services.CreateTicketLog(ticket.ID, &userIDInt, "assign", map[string]interface{}{"oldUserId": oldUserID, "newUserId": input.UserID})
	}

	// Se a fila mudou ou o ticket foi movido para uma fila (estando sem fila)
	if input.QueueID != nil && (oldQueueID == nil || *oldQueueID != *input.QueueID) {
		go func(tID int, qID int) {
			distService := services.NewDistributionService()
			distService.DistributeTicket(tID, qID, tenantID)
		}(ticket.ID, *input.QueueID)
	}

	// Notificar via Socket
	services.EmitToNamespace("/", "ticket", gin.H{"action": "update", "ticket": ticket})

	c.JSON(http.StatusOK, ticket)
}

func ListTicketLogs(c *gin.Context) {
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
