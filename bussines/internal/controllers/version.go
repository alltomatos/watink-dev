package controllers

import (
	"net/http"
	"time"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/gin-gonic/gin"
)

func GetVersion(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"service": "watink-bussines",
		"version": "1.3.197", // Consistent with Node for now
	})
}

func GetPostgresVersion(c *gin.Context) {
	var version string
	database.DB.Raw("SELECT version()").Scan(&version)
	c.JSON(http.StatusOK, gin.H{
		"service":     "postgres",
		"version":     version,
		"lastUpdated": time.Now().Format(time.RFC3339),
	})
}

func GetRabbitMQVersion(c *gin.Context) {
	// Logic to fetch RabbitMQ version (simplified for now)
	c.JSON(http.StatusOK, gin.H{
		"service":     "rabbitmq",
		"version":     "3.12.0",
		"lastUpdated": time.Now().Format(time.RFC3339),
	})
}

func GetRedisVersion(c *gin.Context) {
	// Logic to fetch Redis version
	c.JSON(http.StatusOK, gin.H{
		"service":     "redis",
		"version":     "7.0.0",
		"lastUpdated": time.Now().Format(time.RFC3339),
	})
}
