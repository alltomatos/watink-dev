package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/gin-gonic/gin"
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
	tenantID, _ := c.Get("tenantId")

	var data DashboardData

	// 1. Status Counts
	database.DB.Model(&models.Ticket{}).Where("\"tenantId\" = ? AND status = ?", tenantID, "open").Count(&data.Tickets.Open)
	database.DB.Model(&models.Ticket{}).Where("\"tenantId\" = ? AND status = ?", tenantID, "pending").Count(&data.Tickets.Pending)
	database.DB.Model(&models.Ticket{}).Where("\"tenantId\" = ? AND status = ?", tenantID, "closed").Count(&data.Tickets.Closed)

	// 2. Queue Counts
	var queueCounts []struct {
		QueueID int
		Count   int64
	}
	database.DB.Model(&models.Ticket{}).
		Select("\"queueId\" as queue_id, count(*) as count").
		Where("\"tenantId\" = ? AND \"queueId\" IS NOT NULL AND status != 'closed'", tenantID).
		Group("\"queueId\"").
		Scan(&queueCounts)

	for _, qc := range queueCounts {
		var queue models.Queue
		if err := database.DB.First(&queue, qc.QueueID).Error; err == nil {
			data.Queues = append(data.Queues, QueueCount{
				QueueID:   qc.QueueID,
				QueueName: queue.Name,
				Count:     qc.Count,
			})
		}
	}

	// 3. Metrics (TMR / TME)
	data.Metrics.AvgResponseTime = calculateTMR(tenantID)
	data.Metrics.AvgWaitTime = calculateTME(tenantID)

	c.JSON(http.StatusOK, data)
}

func calculateTMR(tenantID interface{}) float64 {
	var result struct {
		AvgTime float64
	}
	
	// Complex SQL to calculate average time between Contact message and Agent response
	// This query identifies pairs of messages where contact sent first and agent replied next
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
	
	database.DB.Raw(query, tenantID).Scan(&result)
	return result.AvgTime
}

func calculateTME(tenantID interface{}) float64 {
	var result struct {
		AvgTime float64
	}
	
	// TME: Time between Ticket creation and its status moving from 'pending' to 'open' (first assignment)
	// For simplicity, we can use the ticket's updatedAt if the status is 'open', or a dedicated tracking logic.
	// Basic version: diff between CreatedAt and first message FromMe=true
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
	
	database.DB.Raw(query, tenantID).Scan(&result)
	return result.AvgTime
}
