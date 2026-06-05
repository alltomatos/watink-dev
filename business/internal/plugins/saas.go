package plugins

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/sdk"
	"github.com/gin-gonic/gin"
)

// SaaSPlugin — DB via core.GetDB() (DI), zero acesso a database.DB global.
// Nota: Tabela Tenants é global (sem tenantId) — rota protegida por SuperAdminOnly.
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
		db := core.GetDB()
		var tenants []models.Tenant
		db.Find(&tenants)
		c.JSON(http.StatusOK, tenants)
	})

	// POST: Creating tenant (Blocked in ReadOnly)
	core.RegisterRoute("POST", "/saas/manager/tenants", func(c *gin.Context) {
		db := core.GetDB()
		var tenant models.Tenant
		if err := c.ShouldBindJSON(&tenant); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		db.Create(&tenant)
		c.JSON(http.StatusCreated, tenant)
	})

	return nil
}

func (sp *SaaSPlugin) OnDeactivate(core sdk.WatinkCore) error {
	return nil
}
