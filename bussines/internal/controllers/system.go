package controllers

import (
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/process"
)

type TenantConsumption struct {
	TenantID    string `json:"tenantId" gorm:"column:tenant_id"`
	TenantName  string `json:"tenantName" gorm:"column:tenant_name"`
	Users       int64  `json:"users"`
	Contacts    int64  `json:"contacts"`
	Tickets     int64  `json:"tickets"`
	OpenTickets int64  `json:"openTickets" gorm:"column:open_tickets"`
	Whatsapps   int64  `json:"whatsapps"`
}

type RabbitMQStats struct {
	Connected bool                    `json:"connected"`
	Queues    []services.QueueMetrics `json:"queues"`
}

type SystemStats struct {
	CPUUsage          float64             `json:"cpuUsage"`
	MemoryTotal       uint64              `json:"memoryTotal"`
	MemoryUsed        uint64              `json:"memoryUsed"`
	MemoryFree        uint64              `json:"memoryFree"`
	Uptime            float64             `json:"uptime"`
	TenantConsumption []TenantConsumption `json:"tenantConsumption"`
	RabbitMQ          RabbitMQStats       `json:"rabbitmq"`
	Process           struct {
		CPUUsage     float64 `json:"cpuUsage"`
		MemoryUsed   uint64  `json:"memoryUsed"`
		NumGoroutine int     `json:"numGoroutine"`
	} `json:"process"`
	Timestamp int64 `json:"timestamp"`
}

var startTime = time.Now()

func GetRabbitMQQueues(c *gin.Context) {
	rabbit := services.GetRabbitMQService()
	if rabbit == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "RabbitMQ service not initialized"})
		return
	}

	queues, err := rabbit.ListAllQueues()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"connected": rabbit.IsConnected(), "queues": queues, "total": len(queues)})
}

func GetSystemStats(c *gin.Context) {
	var stats SystemStats

	cpuPercentages, _ := cpu.Percent(0, false)
	if len(cpuPercentages) > 0 {
		stats.CPUUsage = cpuPercentages[0]
	}

	v, _ := mem.VirtualMemory()
	if v != nil {
		stats.MemoryTotal = v.Total
		stats.MemoryUsed = v.Used
		stats.MemoryFree = v.Free
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	stats.Process.MemoryUsed = m.Alloc
	stats.Process.NumGoroutine = runtime.NumGoroutine()

	currProc, err := process.NewProcess(int32(os.Getpid()))
	if err == nil {
		procCpu, _ := currProc.CPUPercent()
		stats.Process.CPUUsage = procCpu
	}

	stats.Uptime = time.Since(startTime).Seconds()

	var tenantConsumption []TenantConsumption
	_ = database.DB.Raw(`
		SELECT
			t.id::text AS tenant_id,
			t.name AS tenant_name,
			(SELECT COUNT(*) FROM "Users" u WHERE u."tenantId" = t.id) AS users,
			(SELECT COUNT(*) FROM "Contacts" c WHERE c."tenantId" = t.id) AS contacts,
			(SELECT COUNT(*) FROM "Tickets" tk WHERE tk."tenantId" = t.id) AS tickets,
			(SELECT COUNT(*) FROM "Tickets" tk WHERE tk."tenantId" = t.id AND tk.status = 'open') AS open_tickets,
			(SELECT COUNT(*) FROM "Whatsapps" w WHERE w."tenantId" = t.id) AS whatsapps
		FROM "Tenants" t
		ORDER BY tickets DESC, contacts DESC, users DESC
	`).Scan(&tenantConsumption).Error
	stats.TenantConsumption = tenantConsumption

	rabbit := services.GetRabbitMQService()
	stats.RabbitMQ.Connected = rabbit != nil && rabbit.IsConnected()
	if rabbit != nil {
		if queues, err := rabbit.ListAllQueues(); err == nil {
			stats.RabbitMQ.Queues = queues
		}
	}

	stats.Timestamp = time.Now().Unix()

	c.JSON(http.StatusOK, stats)
}
