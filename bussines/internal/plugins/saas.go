package plugins

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/alltomatos/watinkdev/backend-go/pkg/sdk"
	"github.com/gin-gonic/gin"
)

type SaaSPlugin struct{}

func (sp *SaaSPlugin) GetManifest() sdk.PluginManifest {
	return sdk.PluginManifest{
		Slug:        "saas-plugin",
		Name:        "SaaS Add-on",
		Version:     "1.0.0",
		Description: "Gestão multi-tenant e planos avançados",
		Type:        "pro",
	}
}

func (sp *SaaSPlugin) OnInstall(core sdk.WatinkCore) error {
	return nil
}

func (sp *SaaSPlugin) OnActivate(core sdk.WatinkCore) error {
	// GET: Listing tenants (Allowed in ReadOnly)
	core.RegisterRoute("GET", "/saas/manager/tenants", func(c *gin.Context) {
		var tenants []models.Tenant
		database.DB.Find(&tenants)
		c.JSON(http.StatusOK, tenants)
	})

	// POST: Creating tenant (Blocked in ReadOnly)
	core.RegisterRoute("POST", "/saas/manager/tenants", func(c *gin.Context) {
		var tenant models.Tenant
		if err := c.ShouldBindJSON(&tenant); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		database.DB.Create(&tenant)
		c.JSON(http.StatusCreated, tenant)
	})

	return nil
}

func (sp *SaaSPlugin) OnDeactivate(core sdk.WatinkCore) error {
	return nil
}
