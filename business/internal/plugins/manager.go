package plugins

import (
	"log"
	"net/http"
	"sync"
	"github.com/alltomatos/watinkdev/business/pkg/sdk"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PluginManager struct {
	plugins map[string]sdk.WatinkPlugin
	core    *coreImpl
	mu      sync.RWMutex
}

type coreImpl struct {
	db     *gorm.DB
	router *gin.RouterGroup
	slug   string
}

func (c *coreImpl) GetDB() *gorm.DB {
	return c.db
}

func (c *coreImpl) GetStatus() sdk.PluginStatus {
	return sdk.StatusActive
}

func (c *coreImpl) RegisterRoute(method string, path string, handler gin.HandlerFunc) {
	c.router.Handle(method, path, func(ctx *gin.Context) {
		status := c.GetStatus()
		if status == sdk.StatusBlocked {
			ctx.JSON(http.StatusPaymentRequired, gin.H{"error": "Plugin Blocked - License required"})
			ctx.Abort()
			return
		}
		if status == sdk.StatusReadOnly && method != "GET" {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "Plugin in Read-Only mode - Action not allowed"})
			ctx.Abort()
			return
		}
		handler(ctx)
	})
}

func (c *coreImpl) EmitSocketEvent(room string, event string, payload interface{}) {}

func NewPluginManager(db *gorm.DB, router *gin.RouterGroup) *PluginManager {
	return &PluginManager{
		plugins: make(map[string]sdk.WatinkPlugin),
		core: &coreImpl{
			db:     db,
			router: router,
		},
	}
}

func (pm *PluginManager) Register(p sdk.WatinkPlugin) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	manifest := p.GetManifest()
	if pm.plugins[manifest.Slug] != nil {
		log.Printf("Plugin already registered, skipping: %s", manifest.Slug)
		return
	}
	log.Printf("Registering plugin: %s (%s)", manifest.Name, manifest.Slug)
	pluginCore := &coreImpl{
		db:     pm.core.db,
		router: pm.core.router,
		slug:   manifest.Slug,
	}
	if err := p.OnActivate(pluginCore); err != nil {
		log.Printf("Error activating plugin %s: %v", manifest.Slug, err)
		return
	}
	pm.plugins[manifest.Slug] = p
}

func (pm *PluginManager) GetInstalled() []sdk.PluginManifest {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	manifests := []sdk.PluginManifest{}
	for _, p := range pm.plugins {
		manifests = append(manifests, p.GetManifest())
	}
	return manifests
}
