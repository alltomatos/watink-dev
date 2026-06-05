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

func (pc *PluginController) Catalog(c *gin.Context) {
	c.JSON(http.StatusOK, pc.hubManager.GetCatalog())
}

func (pc *PluginController) Installed(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "PluginInstallations")
	if !ok {
		return
	}

	c.JSON(http.StatusOK, pc.hubManager.GetInstalled(tenantID.String()))
}

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
