package plugins

import (
	"log"
	"net/http"
	"sync"

	"github.com/alltomatos/watinkdev/business/internal/domain"
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
	db     *gorm.DB
	router *gin.RouterGroup
	// publicRouter is the raw, unauthenticated group — RegisterPublicRoute
	// mounts here, never through the license-gating wrapper in RegisterRoute
	// (there is no tenant to check before the handler runs).
	publicRouter *gin.RouterGroup
	slug         string
	registry     *PluginRegistry
	broadcaster  domain.Broadcaster
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

// RegisterPublicRoute mounts an unauthenticated route on publicRouter — no
// license gating, no tenant resolved yet (see sdk.WatinkCore doc).
func (c *coreImpl) RegisterPublicRoute(method string, path string, handler gin.HandlerFunc) {
	c.publicRouter.Handle(method, path, handler)
}

// EmitSocketEvent delivers a real-time event via the injected Broadcaster
// (domain.Broadcaster — SSE/Redis fan-out). Nil-safe: a manager built without
// a broadcaster (tests, NewPluginManager) keeps this a no-op, matching the
// prior stub behavior.
func (c *coreImpl) EmitSocketEvent(room string, event string, payload interface{}) {
	if c.broadcaster == nil {
		return
	}
	c.broadcaster.EmitToRoom("/", room, event, payload)
}

// NewPluginManager builds the manager via constructor injection. registry
// may be nil (e.g. in tests using NewPluginManager(db, group) directly) —
// RegisterRoute then falls back to StatusActive, preserving prior
// zero-registry test behavior. router doubles as publicRouter here (no
// authenticated/public split needed for this simpler constructor).
func NewPluginManager(db *gorm.DB, router *gin.RouterGroup) *PluginManager {
	return &PluginManager{
		plugins: make(map[string]sdk.WatinkPlugin),
		core: &coreImpl{
			db:           db,
			router:       router,
			publicRouter: router,
		},
	}
}

// NewPluginManagerWithRegistry is the DI-pura constructor used by routes.go —
// it plugs the real PluginRegistry (license x allocation) into every
// plugin's coreImpl so RegisterRoute's gating is real, not hardcoded. router
// MUST be the authenticated group (IsAuth + TenantMiddleware already
// applied) — otherwise auth.TenantUUIDFromContext never resolves inside a
// plugin's handlers. publicRouter is the raw, unauthenticated group, for
// RegisterPublicRoute. broadcaster wires EmitSocketEvent to real delivery;
// nil keeps it a no-op.
func NewPluginManagerWithRegistry(db *gorm.DB, router *gin.RouterGroup, publicRouter *gin.RouterGroup, registry *PluginRegistry, broadcaster domain.Broadcaster) *PluginManager {
	return &PluginManager{
		plugins: make(map[string]sdk.WatinkPlugin),
		core: &coreImpl{
			db:           db,
			router:       router,
			publicRouter: publicRouter,
			registry:     registry,
			broadcaster:  broadcaster,
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
		db:           pm.core.db,
		router:       pm.core.router,
		publicRouter: pm.core.publicRouter,
		slug:         manifest.Slug,
		registry:     pm.core.registry,
		broadcaster:  pm.core.broadcaster,
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
