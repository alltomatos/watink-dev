package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/plugins"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PluginController struct {
	db         *gorm.DB
	hubManager *plugins.HubManager
}

func NewPluginController(db *gorm.DB, hubManager *plugins.HubManager) *PluginController {
	return &PluginController{
		db:         db,
		hubManager: hubManager,
	}
}

type checkoutRequest struct {
	Slug string `json:"slug" binding:"required"`
}

// @Summary      Catálogo de plugins
// @Tags         plugins
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /plugins/catalog [get]
func (pc *PluginController) Catalog(c *gin.Context) {
	c.JSON(http.StatusOK, pc.hubManager.GetCatalog())
}

// @Summary      Plugins instalados
// @Tags         plugins
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /plugins/installed [get]
func (pc *PluginController) Installed(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "PluginInstallations")
	if !ok {
		return
	}

	c.JSON(http.StatusOK, pc.hubManager.GetInstalled(tenantID.String()))
}

// @Summary      Ativar/instalar plugin
// @Tags         plugins
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados do checkout"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /plugins/checkout [post]
func (pc *PluginController) Checkout(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "PluginInstallations")
	if !ok {
		return
	}

	limitService := services.NewPlanLimitService(pc.db)
	if err := limitService.CheckLimit(tenantID, "plugins"); err != nil {
		utils.RespondWithServiceError(c, http.StatusForbidden, err, "Plan limit reached for plugins")
		return
	}

	var req checkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	out, status, err := pc.hubManager.CreateCheckout(req.Slug)
	if err != nil {
		c.JSON(status, gin.H{"error": "hub unavailable"})
		return
	}
	c.JSON(http.StatusOK, out)
}

// @Summary      ID da instância
// @Tags         plugins
// @Produce      json
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /plugins/instance [get]
func (pc *PluginController) Instance(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"instanceId": pc.hubManager.GetInstanceID()})
}

// Legacy stubs — remove once all clients migrate to PluginController
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
