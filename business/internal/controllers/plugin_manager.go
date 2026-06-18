package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/gin-gonic/gin"
)

type PluginController struct {
	planLimitSvc domain.PlanLimitServiceInterface
}

func NewPluginController(planLimitSvc domain.PlanLimitServiceInterface) *PluginController {
	return &PluginController{planLimitSvc: planLimitSvc}
}

type checkoutRequest struct {
	Slug string `json:"slug" binding:"required"`
}

// @Summary      Catálogo de plugins
// @Tags         plugins
// @Produce      json
// @Success      503  {object}  map[string]string
// @Security     BearerAuth
// @Router       /plugins/catalog [get]
func (pc *PluginController) Catalog(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "marketplace hub disabled"})
}

// @Summary      Plugins instalados
// @Tags         plugins
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /plugins/installed [get]
func (pc *PluginController) Installed(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"active": []string{}, "statuses": map[string]string{}})
}

// @Summary      Ativar/instalar plugin
// @Tags         plugins
// @Produce      json
// @Success      503  {object}  map[string]string
// @Security     BearerAuth
// @Router       /plugins/checkout [post]
func (pc *PluginController) Checkout(c *gin.Context) {
	c.JSON(http.StatusServiceUnavailable, gin.H{"error": "marketplace hub disabled"})
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
