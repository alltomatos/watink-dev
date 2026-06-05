package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SettingController encapsulates setting operations with RLS-scoped DB from auth middleware.
// Tenant-scoped queries use auth.GetScoped; public settings use root DB for initial tenant lookup.
type SettingController struct {
	db        *gorm.DB
	broadcast *services.RedisBroadcast
}

func NewSettingController(db *gorm.DB, broadcast *services.RedisBroadcast) *SettingController {
	return &SettingController{db: db, broadcast: broadcast}
}

func (sc *SettingController) ListSettings(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Settings")
	if !ok {
		return
	}

	var settings []models.Setting
	if err := db.Where("\"tenantId\" = ?", tenantID).Find(&settings).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListSettings")
		return
	}

	c.JSON(http.StatusOK, settings)
}

// GetPublicSettings uses root DB because it runs BEFORE authentication (public route).
// The first tenant's public branding keys are returned for the login page.
func (sc *SettingController) GetPublicSettings(c *gin.Context) {
	var tenant models.Tenant
	if err := sc.db.Order("id ASC").First(&tenant).Error; err != nil {
		c.JSON(http.StatusOK, []models.Setting{})
		return
	}

	var settings []models.Setting
	publicKeys := []string{"systemLogo", "login_backgroundImage", "login_layout", "systemFavicon"}

	if err := sc.db.Where("key IN ? AND \"tenantId\" = ?", publicKeys, tenant.ID).Find(&settings).Error; err != nil {
		utils.RespondWithInternalError(c, err, "GetPublicSettings")
		return
	}

	c.JSON(http.StatusOK, settings)
}

func (sc *SettingController) UpdateSetting(c *gin.Context) {
	db, tenantUUID, ok := auth.GetScoped(c, "Settings")
	if !ok {
		return
	}
	key := c.Param("key")

	var req struct {
		Value string `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	setting := models.Setting{
		Key:      key,
		TenantID: tenantUUID,
		Value:    req.Value,
	}

	if err := db.Where("key = ? AND \"tenantId\" = ?", key, tenantUUID).Assign(models.Setting{Value: req.Value}).FirstOrCreate(&setting).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateSetting")
		return
	}

	sc.broadcast.EmitToNamespace("/", "settings", map[string]interface{}{
		"action":  "update",
		"setting": setting,
	})

	c.JSON(http.StatusOK, setting)
}
