package controllers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TicketController struct {
	updateTicket *usecases.UpdateTicketUseCase
	broadcast    domain.Broadcaster
	messages     domain.MessageRepository
	publisher    domain.CommandPublisher
}

func NewTicketController(ut *usecases.UpdateTicketUseCase, broadcast domain.Broadcaster, messages domain.MessageRepository, publisher domain.CommandPublisher) *TicketController {
	return &TicketController{
		updateTicket: ut,
		broadcast:    domain.BroadcastOrNop(broadcast),
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

// @Summary      Listar tickets
// @Tags         tickets
// @Produce      json
// @Param        status    query     string  false  "Filtro por status (open, pending, closed)"
// @Param        queueId   query     int     false  "Filtro por fila"
// @Success      200       {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /tickets [get]
func (tc *TicketController) ListTickets(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Tickets")
	if !ok {
		return
	}

	var tickets []models.Ticket
	query := db.
		Preload("Contact.Client").
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

	// isGroup=true  → only group chats (status filter ignored — groups have no SLA status)
	// isGroup=false → only individual tickets (explicit)
	// isGroup absent → default to individual tickets (exclude groups from status-based tabs)
	isGroup := c.Query("isGroup")
	if isGroup == "true" {
		query = query.Where("\"Tickets\".\"isGroup\" = ?", true)
		// Groups are informal chats — status filter doesn't apply.
		query = query.Where("status IS NOT NULL") // no-op but keeps query uniform
	} else if isGroup == "false" {
		query = query.Where("\"Tickets\".\"isGroup\" = ?", false)
	} else {
		// Default: exclude groups so status-based tabs never mix individual and group tickets.
		query = query.Where("\"Tickets\".\"isGroup\" = ?", false)
	}

	if c.Query("withUnreadMessages") == "true" {
		query = query.Where("\"Tickets\".\"unreadMessages\" > ?", 0)
	}

	if err := query.Find(&tickets).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListTickets")
		return
	}

	attachTicketTags(db, tenantID, tickets)

	c.JSON(http.StatusOK, gin.H{
		"tickets": tickets,
		"count":   len(tickets),
		"hasMore": false,
	})
}

// attachTicketTags batch-loads the Tags attached to each ticket (via the
// polymorphic EntityTags table) in two unambiguous single-table queries and
// assigns them onto the transient Ticket.Tags field — avoids N+1 across the
// ticket list. Uses a fresh session (NewDB) because the caller's db carries
// GetScoped's unqualified Where("\"tenantId\" = ?"), which would be ambiguous
// if joined against another tenantId-bearing table.
func attachTicketTags(db *gorm.DB, tenantID uuid.UUID, tickets []models.Ticket) {
	if len(tickets) == 0 {
		return
	}
	ids := make([]int, len(tickets))
	for i, t := range tickets {
		ids[i] = t.ID
	}

	fresh := db.Session(&gorm.Session{NewDB: true})

	var entityTags []models.EntityTag
	if err := fresh.Where("\"tenantId\" = ? AND \"entityType\" = ? AND \"entityId\" IN ?", tenantID, "ticket", ids).
		Find(&entityTags).Error; err != nil || len(entityTags) == 0 {
		return
	}

	tagIDSet := make(map[int]struct{}, len(entityTags))
	entityByTag := make(map[int][]int, len(entityTags)) // tagID -> ticketIDs
	for _, et := range entityTags {
		tagIDSet[et.TagID] = struct{}{}
		entityByTag[et.TagID] = append(entityByTag[et.TagID], et.EntityID)
	}
	tagIDs := make([]int, 0, len(tagIDSet))
	for id := range tagIDSet {
		tagIDs = append(tagIDs, id)
	}

	var tags []models.Tag
	if err := fresh.Where("id IN ?", tagIDs).Find(&tags).Error; err != nil {
		return
	}
	tagByID := make(map[int]models.Tag, len(tags))
	for _, t := range tags {
		tagByID[t.ID] = t
	}

	byTicket := make(map[int][]models.Tag, len(tickets))
	for tagID, ticketIDs := range entityByTag {
		tag, ok := tagByID[tagID]
		if !ok {
			continue
		}
		for _, tid := range ticketIDs {
			byTicket[tid] = append(byTicket[tid], tag)
		}
	}
	for i := range tickets {
		tickets[i].Tags = byTicket[tickets[i].ID]
	}
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
		Preload("Contact.Client").
		Preload("User").
		First(&ticket).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ticket not found"})
		return
	}

	c.JSON(http.StatusOK, ticket)
}
