package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// VersionController centraliza endpoints de versão de serviços.
// DB injetado via construtor — zero acesso a database.DB global.
type VersionController struct {
	db *gorm.DB
}

func NewVersionController(db *gorm.DB) *VersionController {
	return &VersionController{db: db}
}

func (vc *VersionController) GetVersion(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"service": "watink-business",
		"version": "1.3.197", // Consistent with Node for now
	})
}

func (vc *VersionController) GetPostgresVersion(c *gin.Context) {
	var version string
	if err := vc.db.Raw("SELECT version()").Scan(&version).Error; err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database unavailable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"service":     "postgres",
		"version":     version,
		"lastUpdated": time.Now().Format(time.RFC3339),
	})
}

// GetRabbitMQVersion — stub até integração real com Management API.
func (vc *VersionController) GetRabbitMQVersion(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"service":     "rabbitmq",
		"version":     "3.12.0",
		"lastUpdated": time.Now().Format(time.RFC3339),
	})
}

// GetRedisVersion — stub até integração real com Redis INFO.
func (vc *VersionController) GetRedisVersion(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"service":     "redis",
		"version":     "7.0.0",
		"lastUpdated": time.Now().Format(time.RFC3339),
	})
}
