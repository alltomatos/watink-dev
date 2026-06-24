package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

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
