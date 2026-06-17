package controllers

import (
	"net/http"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/gin-gonic/gin"
)

type VersionController struct {
	versionRepo domain.VersionRepository
}

func NewVersionController(versionRepo domain.VersionRepository) *VersionController {
	return &VersionController{versionRepo: versionRepo}
}

// @Summary      Versão do serviço
// @Tags         system
// @Produce      json
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /system/version [get]
func (vc *VersionController) GetVersion(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"service": "watink-business",
		"version": "1.3.197", // Consistent with Node for now
	})
}

// @Summary      Versão do PostgreSQL
// @Tags         system
// @Produce      json
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /system/version/postgres [get]
func (vc *VersionController) GetPostgresVersion(c *gin.Context) {
	version, err := vc.versionRepo.GetPostgresVersion(c.Request.Context())
	if err != nil {
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
// @Summary      Versão do RabbitMQ
// @Tags         system
// @Produce      json
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /system/version/rabbitmq [get]
func (vc *VersionController) GetRabbitMQVersion(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"service":     "rabbitmq",
		"version":     "3.12.0",
		"lastUpdated": time.Now().Format(time.RFC3339),
	})
}

// GetRedisVersion — stub até integração real com Redis INFO.
// @Summary      Versão do Redis
// @Tags         system
// @Produce      json
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /system/version/redis [get]
func (vc *VersionController) GetRedisVersion(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"service":     "redis",
		"version":     "7.0.0",
		"lastUpdated": time.Now().Format(time.RFC3339),
	})
}
