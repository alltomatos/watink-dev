package controllers

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

var (
	maintenanceMode = false
	maintenanceMsg  = "Sistema em manutenção para atualização. Por favor, aguarde."
	mu              sync.RWMutex
)

func GetMaintenanceStatus(c *gin.Context) {
	mu.RLock()
	defer mu.RUnlock()
	c.JSON(http.StatusOK, gin.H{
		"enabled": maintenanceMode,
		"message": maintenanceMsg,
	})
}

func SetMaintenanceMode(enabled bool, message string) {
	mu.Lock()
	defer mu.Unlock()
	maintenanceMode = enabled
	if message != "" {
		maintenanceMsg = message
	}
}

func MaintenanceMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		mu.RLock()
		active := maintenanceMode
		mu.RUnlock()

		// Permitir apenas rotas de status/health e auth durante manutenção
		if active && c.Request.URL.Path != "/api/system/maintenance" && c.Request.URL.Path != "/api/health" {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": maintenanceMsg,
			})
			return
		}
		c.Next()
	}
}
