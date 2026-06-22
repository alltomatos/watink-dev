package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TicketController struct {
	updateTicket *usecases.UpdateTicketUseCase
	broadcast    *services.RedisBroadcast
	messages     domain.MessageRepository
	publisher    domain.CommandPublisher
}

func NewTicketController(ut *usecases.UpdateTicketUseCase, broadcast *services.RedisBroadcast, messages domain.MessageRepository, publisher domain.CommandPublisher) *TicketController {
	return &TicketController{
		updateTicket: ut,
		broadcast:    broadcast,
		messages:     messages,
		publisher:    publisher,
	}
}

// historyCutoff converts a recovery range token into a unix cutoff timestamp.
// "all" (or empty) returns 0, meaning "no lower bound — all available history".
func historyCutoff(rangeToken string, now time.Time) int64 {
	switch rangeToken {
	case "1d":
		return now.Add(-24 * time.Hour).Unix()
	case "2d":
		return now.Add(-48 * time.Hour).Unix()
	case "7d", "1w":
		return now.Add(-7 * 24 * time.Hour).Unix()
	case "30d":
		return now.Add(-30 * 24 * time.Hour).Unix()
	default:
		return 0
	}
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
			// Grupos não têm fila atribuída (queueId = null) — exemptá-los garante
			// que apareçam em todas as abas mesmo quando o filtro de fila está ativo.
			query = query.Where(
				"(\"Tickets\".\"queueId\" IN ? OR \"Tickets\".\"isGroup\" = ?)",
				queueIds, true,
			)
		}
	}

	// Visibility (queue/channel scoping by profile) is enforced by auth.GetScopedDB.
	isGroup := c.Query("isGroup")
	if isGroup == "true" {
		query = query.Where("\"Tickets\".\"isGroup\" = ?", true)
	} else if isGroup == "false" {
		query = query.Where("\"Tickets\".\"isGroup\" = ?", false)
	}

	if c.Query("withUnreadMessages") == "true" {
		query = query.Where("\"Tickets\".\"unreadMessages\" > ?", 0)
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
