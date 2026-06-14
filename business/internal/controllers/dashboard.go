package controllers

import (
	"log/slog"
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DashboardData struct {
	Tickets struct {
		Open    int64 `json:"open"`
		Pending int64 `json:"pending"`
		Closed  int64 `json:"closed"`
	} `json:"tickets"`
	Queues []QueueCount `json:"queues"`
	Metrics struct {
		AvgResponseTime float64 `json:"avgResponseTime"` // in minutes
		AvgWaitTime     float64 `json:"avgWaitTime"`     // in minutes
	} `json:"metrics"`
}

type QueueCount struct {
	QueueID   int    `json:"queueId"`
	QueueName string `json:"queueName"`
	Count     int64  `json:"count"`
}

func GetDashboardData(c *gin.Context) {
	var data DashboardData

	db, tenantID, ok := auth.GetScoped(c, "Tickets")
	if !ok {
		return
	}

	// 1. Status Counts — single GROUP BY instead of 3 separate COUNT queries
	if err := fetchTicketStatusCounts(db, tenantID, &data.Tickets); err != nil {
		utils.RespondWithInternalError(c, err, "dashboard ticket status counts")
		return
	}

	// 2. Queue Counts — JOIN eliminates N+1 loop
	if err := fetchQueueCounts(db, tenantID, &data.Queues); err != nil {
		utils.RespondWithInternalError(c, err, "dashboard queue counts")
		return
	}

	// 3. Metrics (TMR / TME)
	data.Metrics.AvgResponseTime = calculateTMR(tenantID, db)
	data.Metrics.AvgWaitTime = calculateTME(tenantID, db)

	c.JSON(http.StatusOK, data)
}

// fetchTicketStatusCounts populates the ticket status struct with a single
// GROUP BY query instead of 3 individual COUNT queries.
func fetchTicketStatusCounts(db *gorm.DB, tenantID uuid.UUID, target *struct {
	Open    int64 `json:"open"`
	Pending int64 `json:"pending"`
	Closed  int64 `json:"closed"`
}) error {
	var counts []struct {
		Status string
		Count  int64
	}
	if err := db.Model(&models.Ticket{}).
		Select("status, count(*) as count").
		Where("\"tenantId\" = ?", tenantID).
		Group("status").
		Scan(&counts).Error; err != nil {
		return err
	}

	for _, c := range counts {
		switch c.Status {
		case "open":
			target.Open = c.Count
		case "pending":
			target.Pending = c.Count
		case "closed":
			target.Closed = c.Count
		}
	}
	return nil
}

// fetchQueueCounts retrieves queue ticket counts with a single JOIN query,
// eliminating the N+1 loop that previously called db.First() per queue.
func fetchQueueCounts(db *gorm.DB, tenantID uuid.UUID, target *[]QueueCount) error {
	return db.Model(&models.Ticket{}).
		Select("q.id as queue_id, q.name as queue_name, count(tickets.id) as count").
		Joins("JOIN \"Queues\" q ON q.id = tickets.\"queueId\"").
		Where("tickets.\"tenantId\" = ? AND tickets.\"queueId\" IS NOT NULL AND tickets.status != 'closed'", tenantID).
		Group("q.id, q.name").
		Scan(target).Error
}

// calculateTMR computes the average response time (Tempo Médio de Resposta)
// between a contact message and the first agent reply on the same ticket.
// Returns 0 when no data exists or on query failure (logged via slog).
func calculateTMR(tenantID uuid.UUID, db *gorm.DB) float64 {
	var result struct {
		AvgTime float64
	}

	query := `
		WITH message_pairs AS (
			SELECT
				m1."ticketId",
				m1."createdAt" as contact_time,
				MIN(m2."createdAt") as agent_time
			FROM "Messages" m1
			JOIN "Messages" m2 ON m1."ticketId" = m2."ticketId"
				AND m2."createdAt" > m1."createdAt"
				AND m2."fromMe" = true
			WHERE m1."fromMe" = false
				AND m1."tenantId" = ?
			GROUP BY m1.id, m1."ticketId", m1."createdAt"
		)
		SELECT AVG(EXTRACT(EPOCH FROM (agent_time - contact_time)) / 60) as avg_time
		FROM message_pairs
	`

	if err := db.Raw(query, tenantID).Scan(&result).Error; err != nil {
		slog.Error("dashboard: calculateTMR failed",
			"tenantId", tenantID, "error", err)
		return 0
	}
	return result.AvgTime
}

// calculateTME computes the average wait time (Tempo Médio de Espera)
// between ticket creation and the first agent reply.
// Returns 0 when no data exists or on query failure (logged via slog).
func calculateTME(tenantID uuid.UUID, db *gorm.DB) float64 {
	var result struct {
		AvgTime float64
	}

	query := `
		WITH first_replies AS (
			SELECT
				t.id,
				t."createdAt" as ticket_created,
				MIN(m."createdAt") as first_reply
			FROM "Tickets" t
			JOIN "Messages" m ON m."ticketId" = t.id AND m."fromMe" = true
			WHERE t."tenantId" = ?
			GROUP BY t.id
		)
		SELECT AVG(EXTRACT(EPOCH FROM (first_reply - ticket_created)) / 60) as avg_time
		FROM first_replies
	`

	if err := db.Raw(query, tenantID).Scan(&result).Error; err != nil {
		slog.Error("dashboard: calculateTME failed",
			"tenantId", tenantID, "error", err)
		return 0
	}
	return result.AvgTime
}
