package controllers

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// List — GET /protocols. Filtros opcionais: searchParam (protocolNumber/subject),
// status, priority, contactId, ticketId. Paginação de 20 por página.
func (pc *ProtocolController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}

	q := db.Session(&gorm.Session{NewDB: true}).Model(&models.Protocol{}).
		Where("\"tenantId\" = ?", tenantID)

	if s := c.Query("searchParam"); s != "" {
		like := "%" + s + "%"
		q = q.Where("\"protocolNumber\" ILIKE ? OR subject ILIKE ?", like, like)
	}
	if s := c.Query("status"); s != "" {
		q = q.Where("status = ?", s)
	}
	if s := c.Query("priority"); s != "" {
		q = q.Where("priority = ?", s)
	}
	if s := c.Query("contactId"); s != "" {
		q = q.Where("\"contactId\" = ?", s)
	}
	if s := c.Query("ticketId"); s != "" {
		q = q.Where("\"ticketId\" = ?", s)
	}

	pageNumber := 1
	if p, err := strconv.Atoi(c.Query("pageNumber")); err == nil && p > 0 {
		pageNumber = p
	}
	const limit = 20
	offset := limit * (pageNumber - 1)

	var count int64
	q.Count(&count)

	var protocols []models.Protocol
	if err := q.Preload("Contact.Client").
		Order("\"createdAt\" DESC").Limit(limit).Offset(offset).
		Find(&protocols).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListProtocols")
		return
	}

	hasMore := count > int64(offset+len(protocols))
	c.JSON(http.StatusOK, gin.H{"protocols": protocols, "count": count, "hasMore": hasMore})
}

// Show — GET /protocols/:protocolId. Inclui contato (+cliente) e o histórico
// completo (mais recente primeiro) com o autor de cada evento.
func (pc *ProtocolController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}
	id := c.Param("protocolId")

	var protocol models.Protocol
	err := db.Session(&gorm.Session{NewDB: true}).
		Preload("Contact.Client").
		Preload("History", func(d *gorm.DB) *gorm.DB { return d.Order("\"createdAt\" DESC") }).
		Preload("History.User").
		Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		First(&protocol).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "protocol not found"})
		return
	}
	c.JSON(http.StatusOK, protocol)
}

// protocolPriorityRank ordena por urgência: urgent primeiro, low por último.
var protocolPriorityRank = map[string]int{"urgent": 0, "high": 1, "medium": 2, "low": 3}

// myActivityItem é a projeção de Protocol para a tela "Minhas Atividades" —
// além dos campos do protocolo, computa slaStatus a partir de dueDate (o
// backend decide o status, o frontend só pinta a cor).
type myActivityItem struct {
	ID             int         `json:"id"`
	ProtocolNumber string      `json:"protocolNumber"`
	Subject        string      `json:"subject"`
	Status         string      `json:"status"`
	Priority       string      `json:"priority"`
	DueDate        *time.Time  `json:"dueDate"`
	CreatedAt      time.Time   `json:"createdAt"`
	SlaStatus      string      `json:"slaStatus"` // "on_time" | "overdue" | "none"
	Contact        interface{} `json:"contact,omitempty"`
}

// MyActivities — GET /my-activities. Protocolos ATRIBUÍDOS ao usuário autenticado
// (Protocol.UserID) ainda não resolvidos/fechados, ordenados por prioridade
// (urgente→baixa) e, dentro da mesma prioridade, atrasados primeiro e depois por
// prazo mais próximo — para o colaborador com muitos atendimentos se organizar.
func (pc *ProtocolController) MyActivities(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}
	userID, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	var protocols []models.Protocol
	if err := db.Session(&gorm.Session{NewDB: true}).
		Preload("Contact.Client").
		Where("\"tenantId\" = ? AND \"userId\" = ? AND status NOT IN ?", tenantID, userID, []string{"resolved", "closed"}).
		Find(&protocols).Error; err != nil {
		utils.RespondWithInternalError(c, err, "MyActivities")
		return
	}

	now := time.Now()
	items := make([]myActivityItem, 0, len(protocols))
	for _, p := range protocols {
		slaStatus := "none"
		if p.DueDate != nil {
			if p.DueDate.Before(now) {
				slaStatus = "overdue"
			} else {
				slaStatus = "on_time"
			}
		}
		var contact interface{}
		if p.Contact != nil {
			cm := gin.H{"name": p.Contact.Name}
			if p.Contact.Client != nil {
				cm["client"] = gin.H{"socialName": p.Contact.Client.SocialName}
			}
			contact = cm
		}
		items = append(items, myActivityItem{
			ID: p.ID, ProtocolNumber: p.ProtocolNumber, Subject: p.Subject,
			Status: p.Status, Priority: p.Priority, DueDate: p.DueDate,
			CreatedAt: p.CreatedAt, SlaStatus: slaStatus, Contact: contact,
		})
	}

	sort.SliceStable(items, func(i, j int) bool {
		pi, pj := protocolPriorityRank[items[i].Priority], protocolPriorityRank[items[j].Priority]
		if pi != pj {
			return pi < pj
		}
		if items[i].SlaStatus != items[j].SlaStatus {
			// Atrasado vence dentro da mesma prioridade — precisa de atenção primeiro.
			return items[i].SlaStatus == "overdue"
		}
		if items[i].DueDate != nil && items[j].DueDate != nil {
			return items[i].DueDate.Before(*items[j].DueDate)
		}
		return items[i].CreatedAt.Before(items[j].CreatedAt)
	})

	c.JSON(http.StatusOK, gin.H{"activities": items})
}
