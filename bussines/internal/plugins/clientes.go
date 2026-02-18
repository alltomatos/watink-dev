package plugins

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/alltomatos/watinkdev/backend-go/pkg/sdk"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ClientesPlugin struct{}

func (cp *ClientesPlugin) GetManifest() sdk.PluginManifest {
	return sdk.PluginManifest{
		Slug:        "clientes",
		Name:        "Gestão de Clientes",
		Version:     "1.2.0",
		Description: "CRM Básico para gestão de base",
		Type:        "pro",
	}
}

func (cp *ClientesPlugin) OnInstall(core sdk.WatinkCore) error {
	return core.GetDB().AutoMigrate(&models.Client{})
}

func (cp *ClientesPlugin) OnActivate(core sdk.WatinkCore) error {
	// GET /api/clientes
	core.RegisterRoute("GET", "/clientes", func(c *gin.Context) {
		tenantID, _ := c.Get("tenantId")
		var clients []models.Client
		database.DB.Where("tenantId = ?", tenantID).Find(&clients)
		c.JSON(http.StatusOK, clients)
	})

	// POST /api/clientes
	core.RegisterRoute("POST", "/clientes", func(c *gin.Context) {
		tenantID, _ := c.Get("tenantId")
		var client models.Client
		if err := c.ShouldBindJSON(&client); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		// Ensure tenantId
		if tid, ok := tenantID.(uuid.UUID); ok {
			client.TenantID = tid
		}
		database.DB.Create(&client)
		c.JSON(http.StatusCreated, client)
	})

	return nil
}

func (cp *ClientesPlugin) OnDeactivate(core sdk.WatinkCore) error {
	return nil
}
