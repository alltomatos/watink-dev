package controllers

import (
	"net/http"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/plugins"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/sdk"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// staticCatalogEntry is the shape of GET /plugins/catalog's static, hardcoded
// list. There is no real catalog source yet -- the Hub (authority per ADR
// 0024) does not exist, and the plugin-manager's own catalog endpoint has no
// usable data either. This is a PLACEHOLDER just so the frontend Marketplace
// does not break; it must be replaced by a real proxy to the plugin-manager
// (which will itself proxy the Hub) once that exists.
// TODO(ADR 0024): replace this static list with GET /internal/catalog on the
// plugin-manager, once the Hub/plugin-manager side has a real catalog.
type staticCatalogEntry struct {
	Slug  string `json:"slug"`
	Name  string `json:"name"`
	Type  string `json:"type"`
	Price string `json:"price"`
}

var staticCatalog = []staticCatalogEntry{
	{Slug: "helpdesk", Name: "Helpdesk", Type: "pro", Price: "sob consulta"},
	{Slug: "webchat", Name: "Web Chat", Type: "pro", Price: "sob consulta"},
}

type PluginController struct {
	planLimitSvc domain.PlanLimitServiceInterface
	db           *gorm.DB
	registry     *plugins.PluginRegistry
	license      plugins.LicenseFetcher
}

// NewPluginController is built via constructor injection (DI pura) -- db,
// registry and license are always passed in, never resolved through a
// global/service locator. registry/license may be nil in tests that only
// exercise Catalog/Instance.
func NewPluginController(planLimitSvc domain.PlanLimitServiceInterface, db *gorm.DB, registry *plugins.PluginRegistry, license plugins.LicenseFetcher) *PluginController {
	return &PluginController{planLimitSvc: planLimitSvc, db: db, registry: registry, license: license}
}

type checkoutRequest struct {
	Slug string `json:"slug" binding:"required"`
}

// @Summary      Ativar/instalar plugin (legado)
// @Description  Endpoint legado -- superado por POST /plugins/:slug/activate.
// @Tags         plugins
// @Produce      json
// @Success      503  {object}  map[string]string
// @Security     BearerAuth
// @Router       /plugins/checkout [post]
func (pc *PluginController) Checkout(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "use POST /plugins/:slug/activate"})
}

// @Summary      Catálogo de plugins
// @Description  Lista ESTÁTICA e placeholder (ver TODO no código) até o Hub existir.
// @Tags         plugins
// @Produce      json
// @Success      200  {array}   staticCatalogEntry
// @Security     BearerAuth
// @Router       /plugins/catalog [get]
func (pc *PluginController) Catalog(c *gin.Context) {
	c.JSON(http.StatusOK, staticCatalog)
}

// @Summary      Plugins instalados
// @Tags         plugins
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /plugins/installed [get]
func (pc *PluginController) Installed(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Plugins")
	if !ok {
		return
	}

	var installs []models.PluginInstallation
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where(`"tenantId" = ? AND active = ?`, tenantID, true).
		Find(&installs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load plugin installations"})
		return
	}

	active := make([]string, 0, len(installs))
	statuses := make(map[string]string, len(installs))
	for _, inst := range installs {
		active = append(active, inst.PluginID)
		if pc.registry != nil {
			statuses[inst.PluginID] = string(pc.registry.GetStatus(tenantID, inst.PluginID))
		} else {
			statuses[inst.PluginID] = string(sdk.StatusBlocked)
		}
	}

	c.JSON(http.StatusOK, gin.H{"active": active, "statuses": statuses})
}

// @Summary      Ativar plugin
// @Description  Ativa/aloca um plugin para o tenant atual. 402 se sem licença válida ou teto de tenants atingido.
// @Tags         plugins
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Failure      402  {object}  map[string]string
// @Security     BearerAuth
// @Router       /plugins/{slug}/activate [post]
func (pc *PluginController) Activate(c *gin.Context) {
	slug := c.Param("slug")
	db, tenantID, ok := auth.GetScoped(c, "Plugins")
	if !ok {
		return
	}

	if pc.license == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "license service unavailable"})
		return
	}

	info, err := pc.license.GetLicense(slug)
	// Sem licença válida (indeterminado, unlicensed, blocked, readonly) nunca
	// autoriza uma NOVA ativação -- só "active" libera crescimento (ADR 0024,
	// fail-closed). checkoutUrl fica vazio: não há Hub real ainda para gerar
	// o link de compra (ver docs/agents/plugins.md).
	if err != nil || info.Status != "active" {
		c.JSON(http.StatusPaymentRequired, gin.H{"error": "plugin_unlicensed", "checkoutUrl": ""})
		return
	}

	writeDB := db.Session(&gorm.Session{NewDB: true})

	if info.TenantCap > 0 {
		var existing models.PluginInstallation
		hasRow := true
		if err := writeDB.Session(&gorm.Session{NewDB: true}).
			Where(`"tenantId" = ? AND "pluginId" = ?`, tenantID, slug).
			First(&existing).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check allocation"})
				return
			}
			hasRow = false
		}

		if !hasRow {
			var count int64
			if err := writeDB.Session(&gorm.Session{NewDB: true}).
				Model(&models.PluginInstallation{}).
				Where(`"pluginId" = ? AND active = ?`, slug, true).
				Count(&count).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check tenant cap"})
				return
			}
			if count >= int64(info.TenantCap) {
				c.JSON(http.StatusPaymentRequired, gin.H{"error": "plugin_tenant_cap_reached"})
				return
			}
		}
	}

	now := time.Now()
	if err := upsertInstallation(writeDB, tenantID, slug, now); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to activate plugin"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"slug": slug, "active": true})
}

// @Summary      Desativar plugin
// @Tags         plugins
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /plugins/{slug}/deactivate [post]
func (pc *PluginController) Deactivate(c *gin.Context) {
	slug := c.Param("slug")
	db, tenantID, ok := auth.GetScoped(c, "Plugins")
	if !ok {
		return
	}

	// active=false preserva histórico/auditoria (ActivatedAt/By), preferível a
	// DELETE -- consistente com o padrão "suspensão nunca apaga" usado em
	// outras partes do projeto (watink-saas).
	if err := db.Session(&gorm.Session{NewDB: true}).
		Model(&models.PluginInstallation{}).
		Where(`"tenantId" = ? AND "pluginId" = ?`, tenantID, slug).
		Update("active", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to deactivate plugin"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"slug": slug, "active": false})
}

// @Summary      ID da instância
// @Tags         plugins
// @Produce      json
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /plugins/instance [get]
func (pc *PluginController) Instance(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"instanceId": ""})
}

// Legacy stubs -- remove once all clients migrate to PluginController
func PluginsCatalog(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "migrate to PluginController"})
}
func PluginsInstalled(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "migrate to PluginController"})
}
func PluginsCheckout(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "migrate to PluginController"})
}
func PluginsInstance(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "migrate to PluginController"})
}

// upsertInstallation creates or reactivates the (tenantId, pluginId) row.
// UNIQUE(tenantId, pluginId) on the model means a plain Create on an existing
// row would violate the constraint -- use ON CONFLICT DO UPDATE instead so
// re-activating an already-existing (possibly inactive) row never duplicates
// it.
//
// Note on ActivatedBy: models.PluginInstallation.ActivatedBy is *uuid.UUID,
// but the authenticated userId injected by middleware.IsAuth is a numeric
// Users.ID (int), not a UUID (see pkg/auth/permission.go userIDFromContext,
// unexported). There is no safe conversion between the two types, so
// ActivatedBy is intentionally left NULL by this upsert rather than
// fabricating a UUID from an int or reinterpreting the column. This is a
// pre-existing model/context type mismatch; fixing it would mean changing
// the model (models/plugin_installation.go), which is out of scope for this
// endpoint slice per task instructions.
func upsertInstallation(db *gorm.DB, tenantID interface{}, slug string, now time.Time) error {
	// A plain GORM Create would violate UNIQUE(tenantId, pluginId) (added via
	// raw SQL migration in database.go -- not expressed as a GORM tag on the
	// model, see models/plugin_installation.go) if the row already exists
	// (e.g. reactivating a previously deactivated allocation). Look the row
	// up first and branch explicitly instead of relying on a named ON
	// CONFLICT target, since the constraint's existence differs between the
	// production migration and the test schema (AutoMigrate does not create
	// it from the model tags).
	var existing models.PluginInstallation
	err := db.Where(`"tenantId" = ? AND "pluginId" = ?`, tenantID, slug).First(&existing).Error
	if err == nil {
		return db.Model(&existing).Updates(map[string]interface{}{
			"active":      true,
			"activatedAt": now,
		}).Error
	}
	if err != gorm.ErrRecordNotFound {
		return err
	}

	inst := models.PluginInstallation{
		TenantID:    tenantID.(uuid.UUID),
		PluginID:    slug,
		Active:      true,
		ActivatedAt: &now,
	}
	return db.Create(&inst).Error
}
