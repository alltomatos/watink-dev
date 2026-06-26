package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

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

	tc.broadcast.EmitToTenantRoom(tenantID.String(), "ticket", gin.H{"action": "update", "ticket": updatedTicket})
	c.JSON(http.StatusOK, updatedTicket)
}

// @Summary      Recuperar histórico da conversa
// @Description  Solicita ao WhatsApp mensagens anteriores e as insere no ticket sem reabri-lo
// @Tags         tickets
// @Accept       json
// @Produce      json
// @Param        ticketId  path      int                     true  "ID do ticket"
// @Param        body      body      map[string]interface{}  false  "range: 1d|2d|7d|30d|all"
// @Success      202       {object}  map[string]string
// @Failure      404       {object}  map[string]string
// @Security     BearerAuth
// @Router       /tickets/{ticketId}/history/recover [post]
func (tc *TicketController) RecoverHistory(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Tickets")
	if !ok {
		return
	}
	ticketID, err := strconv.Atoi(c.Param("ticketId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticket id"})
		return
	}

	var input struct {
		Range string `json:"range"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	var ticket models.Ticket
	if err := db.Where("id = ?", ticketID).Preload("Contact").First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}
	if ticket.Contact.Number == "" {
		c.JSON(http.StatusConflict, gin.H{"error": "Ticket contact has no WhatsApp number"})
		return
	}

	chatJID := ticket.Contact.Number + "@s.whatsapp.net"
	if ticket.IsGroup {
		chatJID = ticket.Contact.Number + "@g.us"
	}

	payload := map[string]interface{}{
		"chatJid":         chatJID,
		"ticketId":        ticket.ID,
		"cutoffTimestamp": historyCutoff(input.Range, time.Now()),
	}

	if oldest, err := tc.messages.FindOldestByTicket(c.Request.Context(), ticket.ID, tenantID); err == nil && oldest != nil {
		payload["oldestMsgId"] = oldest.ID
		payload["oldestMsgFromMe"] = oldest.FromMe
		payload["oldestMsgTimestamp"] = oldest.CreatedAt.Unix()
	}

	command := map[string]interface{}{
		"id":        uuid.New().String(),
		"timestamp": time.Now().UnixMilli(),
		"tenantId":  tenantID.String(),
		"type":      "history.recover",
		"payload":   payload,
	}
	routingKey := fmt.Sprintf("wbot.%s.%d.history.recover", tenantID.String(), ticket.WhatsappID)
	if err := tc.publisher.PublishCommand(routingKey, command); err != nil {
		utils.RespondWithInternalError(c, err, "RecoverHistory")
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"message": "History recovery requested"})
}
