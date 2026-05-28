package controllers

import (
	"net/http"
	"strings"
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
		path := strings.ToLower(c.Request.URL.Path)
		isHealthOrSetup := path == "/api/health" || path == "/api/initial-setup/check" ||
		                   path == "/api/v1/health" || path == "/api/v1/initial-setup/check" ||
		                   path == "/api/system/maintenance" || path == "/api/v1/system/maintenance"

		if active && !isHealthOrSetup {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": maintenanceMsg,
			})
			return
		}
		c.Next()
	}
}
