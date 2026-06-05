package plugins

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/sdk"
	"github.com/gin-gonic/gin"
)

// ClientesPlugin — DB via core.GetDB() (DI), zero acesso a database.DB global.
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
		tenantID, err := auth.TenantUUIDFromContext(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant"})
			return
		}
		db := core.GetDB()
		var clients []models.Client
		db.Where("\"tenantId\" = ?", tenantID).Find(&clients)
		c.JSON(http.StatusOK, clients)
	})

	// POST /api/clientes
	core.RegisterRoute("POST", "/clientes", func(c *gin.Context) {
		tenantID, err := auth.TenantUUIDFromContext(c)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant"})
			return
		}
		db := core.GetDB()
		var client models.Client
		if err := c.ShouldBindJSON(&client); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		// Ensure tenantId from JWT context (never trust payload)
		client.TenantID = tenantID
		db.Create(&client)
		c.JSON(http.StatusCreated, client)
	})

	return nil
}

func (cp *ClientesPlugin) OnDeactivate(core sdk.WatinkCore) error {
	return nil
}
