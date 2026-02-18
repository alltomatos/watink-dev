package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
)

func ListTickets(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	
	var tickets []models.Ticket
	query := database.DB.Where("\"tenantId\" = ?", tenantID).
		Preload("Contact").
		Order("\"updatedAt\" DESC")

	// Filter by status if provided
	status := c.Query("status")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tickets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tickets": tickets,
	})
}

func ShowTicket(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	ticketID := c.Param("ticketId")

	var ticket models.Ticket
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", ticketID, tenantID).
		Preload("Contact").
		First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	c.JSON(http.StatusOK, ticket)
}
