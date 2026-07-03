package plugins

import (
	"log"
	"net/http"
	"sync"

	"github.com/alltomatos/watinkdev/business/pkg/auth"
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
	db       *gorm.DB
	router   *gin.RouterGroup
	slug     string
	registry *PluginRegistry
}

func (c *coreImpl) GetDB() *gorm.DB {
	return c.db
}

// GetStatus is the zero-arg, tenant-agnostic method required by the
// sdk.WatinkCore interface (plugins may call it directly, without a
// request context). It always reports Active. The REAL, tenant-aware
// enforcement — cross of license x allocation (ADR 0024) — happens in the
// RegisterRoute wrapper below via c.registry.GetStatus(tenantId, slug),
// never through this method.
func (c *coreImpl) GetStatus() sdk.PluginStatus {
	return sdk.StatusActive
}

func (c *coreImpl) RegisterRoute(method string, path string, handler gin.HandlerFunc) {
	c.router.Handle(method, path, func(ctx *gin.Context) {
		status := sdk.StatusActive
		if c.registry != nil {
			tenantID, err := auth.TenantUUIDFromContext(ctx)
			if err != nil {
				// Sem tenantId resolvido no contexto: fail-closed — nunca
				// liberar uma rota de plugin sem saber qual tenant a está
				// chamando (ADR 0024, alocação é sempre por tenant).
				status = sdk.StatusBlocked
			} else {
				status = c.registry.GetStatus(tenantID, c.slug)
			}
		}
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

// NewPluginManager builds the manager via constructor injection. registry
// may be nil (e.g. in tests using NewPluginManager(db, group) directly) —
// RegisterRoute then falls back to StatusActive, preserving prior
// zero-registry test behavior.
func NewPluginManager(db *gorm.DB, router *gin.RouterGroup) *PluginManager {
	return &PluginManager{
		plugins: make(map[string]sdk.WatinkPlugin),
		core: &coreImpl{
			db:     db,
			router: router,
		},
	}
}

// NewPluginManagerWithRegistry is the DI-pura constructor used by main.go —
// it plugs the real PluginRegistry (license x allocation) into every
// plugin's coreImpl so RegisterRoute's gating is real, not hardcoded.
func NewPluginManagerWithRegistry(db *gorm.DB, router *gin.RouterGroup, registry *PluginRegistry) *PluginManager {
	return &PluginManager{
		plugins: make(map[string]sdk.WatinkPlugin),
		core: &coreImpl{
			db:       db,
			router:   router,
			registry: registry,
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
		db:       pm.core.db,
		router:   pm.core.router,
		slug:     manifest.Slug,
		registry: pm.core.registry,
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
