package controllers

import (
	"net/http"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// protocolKanbanCols define as colunas do board Helpdesk. Rótulos e cores são
// dado de UI carregado pela API (o frontend usa color/bgColor como CSS direto).
var protocolKanbanCols = []struct {
	Status  string
	Label   string
	Color   string
	BgColor string
}{
	{"open", "Aberto", "#2196F3", "#E3F2FD"},
	{"in_progress", "Em Andamento", "#FF9800", "#FFF3E0"},
	{"pending", "Pendente", "#9E9E9E", "#F5F5F5"},
	{"resolved", "Resolvido", "#4CAF50", "#E8F5E9"},
	{"closed", "Fechado", "#616161", "#EEEEEE"},
}

// Kanban — GET /protocols/kanban. Retorna as colunas fixas com os protocolos do
// tenant agrupados por status.
func (pc *ProtocolController) Kanban(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}

	var protocols []models.Protocol
	if err := db.Session(&gorm.Session{NewDB: true}).
		Preload("Contact").
		Where("\"tenantId\" = ?", tenantID).
		Order("\"createdAt\" DESC").Find(&protocols).Error; err != nil {
		utils.RespondWithInternalError(c, err, "KanbanProtocols")
		return
	}

	type card struct {
		ID             int         `json:"id"`
		ProtocolNumber string      `json:"protocolNumber"`
		Subject        string      `json:"subject"`
		Status         string      `json:"status"`
		Priority       string      `json:"priority"`
		Contact        interface{} `json:"contact"`
	}
	byStatus := map[string][]card{}
	for _, p := range protocols {
		var contact interface{}
		if p.Contact != nil {
			contact = map[string]interface{}{"name": p.Contact.Name, "profilePicUrl": p.Contact.ProfilePicUrl}
		}
		byStatus[p.Status] = append(byStatus[p.Status], card{
			ID: p.ID, ProtocolNumber: p.ProtocolNumber, Subject: p.Subject,
			Status: p.Status, Priority: p.Priority, Contact: contact,
		})
	}

	columns := make([]map[string]interface{}, 0, len(protocolKanbanCols))
	for _, col := range protocolKanbanCols {
		cards := byStatus[col.Status]
		if cards == nil {
			cards = []card{}
		}
		columns = append(columns, map[string]interface{}{
			"status": col.Status, "label": col.Label,
			"color": col.Color, "bgColor": col.BgColor, "protocols": cards,
		})
	}
	c.JSON(http.StatusOK, gin.H{"columns": columns})
}

// Dashboard — GET /protocols/dashboard. Agregações por status/prioridade/
// categoria (top 10) e conformidade de SLA (abertos/em andamento com dueDate).
func (pc *ProtocolController) Dashboard(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Protocols")
	if !ok {
		return
	}
	base := func() *gorm.DB {
		return db.Session(&gorm.Session{NewDB: true}).Model(&models.Protocol{}).Where("\"tenantId\" = ?", tenantID)
	}

	type statusCount struct {
		Status string `json:"status"`
		Count  int    `json:"count"`
	}
	type priorityCount struct {
		Priority string `json:"priority"`
		Count    int    `json:"count"`
	}
	type categoryCount struct {
		Category string `json:"category"`
		Count    int    `json:"count"`
	}

	statusCounts := []statusCount{}
	base().Select("status, count(*) as count").Group("status").Scan(&statusCounts)

	priorityCounts := []priorityCount{}
	base().Select("priority, count(*) as count").Group("priority").Scan(&priorityCounts)

	categoryCounts := []categoryCount{}
	base().Where("category IS NOT NULL AND category <> ''").
		Select("category, count(*) as count").Group("category").
		Order("count DESC").Limit(10).Scan(&categoryCounts)

	var slaRows []struct {
		DueDate *time.Time `gorm:"column:dueDate"`
	}
	base().Where("status IN ? AND \"dueDate\" IS NOT NULL", []string{"open", "in_progress"}).
		Select("\"dueDate\"").Scan(&slaRows)
	now := time.Now()
	onTime, overdue := 0, 0
	for _, r := range slaRows {
		if r.DueDate != nil && r.DueDate.Before(now) {
			overdue++
		} else {
			onTime++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"statusCounts":   statusCounts,
		"priorityCounts": priorityCounts,
		"categoryCounts": categoryCounts,
		"slaStatus":      gin.H{"onTime": onTime, "overdue": overdue},
	})
}

// PublicShow — GET /public/protocols/:token (SEM auth). Projeção sanitizada: sem
// PII do contato, sem tenantId/userId/token/ticketId/dueDate. Só o necessário
// para a página pública de acompanhamento.
func (pc *ProtocolController) PublicShow(c *gin.Context) {
	token := c.Param("token")

	var protocol models.Protocol
	err := pc.db.
		Preload("History", func(d *gorm.DB) *gorm.DB { return d.Order("\"createdAt\" DESC") }).
		Preload("History.User").
		Where("token = ?", token).First(&protocol).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Protocol not found"})
		return
	}

	var tenantName string
	pc.db.Model(&models.Tenant{}).Where("id = ?", protocol.TenantID).Select("name").Scan(&tenantName)

	history := make([]gin.H, 0, len(protocol.History))
	for _, h := range protocol.History {
		var user interface{}
		if h.User != nil {
			user = gin.H{"name": h.User.Name}
		}
		history = append(history, gin.H{
			"id": h.ID, "action": h.Action, "comment": h.Comment,
			"changes": h.Changes, "createdAt": h.CreatedAt, "user": user,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"protocolNumber": protocol.ProtocolNumber,
		"status":         protocol.Status,
		"priority":       protocol.Priority,
		"subject":        protocol.Subject,
		"description":    protocol.Description,
		"category":       protocol.Category,
		"createdAt":      protocol.CreatedAt,
		"resolvedAt":     protocol.ResolvedAt,
		"closedAt":       protocol.ClosedAt,
		"tenant":         gin.H{"name": tenantName},
		"history":        history,
	})
}
