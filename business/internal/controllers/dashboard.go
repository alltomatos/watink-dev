package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
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
	Queues  []QueueCount `json:"queues"`
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
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var data DashboardData

	// Use the scoped database from auth middleware
	db := getDB(c)

	// 1. Status Counts
	db.Model(&models.Ticket{}).Where("\"tenantId\" = ? AND status = ?", tenantID, "open").Count(&data.Tickets.Open)
	db.Model(&models.Ticket{}).Where("\"tenantId\" = ? AND status = ?", tenantID, "pending").Count(&data.Tickets.Pending)
	db.Model(&models.Ticket{}).Where("\"tenantId\" = ? AND status = ?", tenantID, "closed").Count(&data.Tickets.Closed)

	// 2. Queue Counts
	var queueCounts []struct {
		QueueID int
		Count   int64
	}
	db.Model(&models.Ticket{}).
		Select("\"queueId\" as queue_id, count(*) as count").
		Where("\"tenantId\" = ? AND \"queueId\" IS NOT NULL AND status != 'closed'", tenantID).
		Group("\"queueId\"").
		Scan(&queueCounts)

	for _, qc := range queueCounts {
		var queue models.Queue
		if err := db.First(&queue, qc.QueueID).Error; err == nil {
			data.Queues = append(data.Queues, QueueCount{
				QueueID:   qc.QueueID,
				QueueName: queue.Name,
				Count:     qc.Count,
			})
		}
	}

	// 3. Metrics (TMR / TME)
	data.Metrics.AvgResponseTime = calculateTMR(tenantID, db)
	data.Metrics.AvgWaitTime = calculateTME(tenantID, db)

	c.JSON(http.StatusOK, data)
}

func calculateTMR(tenantID uuid.UUID, db *gorm.DB) float64 {
	var result struct {
		AvgTime float64
	}

	// Complex SQL to calculate average time between Contact message and Agent response
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

	db.Raw(query, tenantID).Scan(&result)
	return result.AvgTime
}

func calculateTME(tenantID uuid.UUID, db *gorm.DB) float64 {
	var result struct {
		AvgTime float64
	}

	// TME: Time between Ticket creation and first agent reply
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

	db.Raw(query, tenantID).Scan(&result)
	return result.AvgTime
}
