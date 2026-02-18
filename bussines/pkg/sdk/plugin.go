package sdk

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PluginStatus defines the current state of a plugin license
type PluginStatus string

const (
	StatusActive   PluginStatus = "active"
	StatusBlocked  PluginStatus = "blocked"
	StatusReadOnly PluginStatus = "readonly"
)

// PluginManifest defines the metadata and requirements of a plugin
type PluginManifest struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Type        string `json:"type"` // "free" | "premium"
}

// WatinkCore defines the interface for plugins to interact with the core system
type WatinkCore interface {
	GetDB() *gorm.DB
	RegisterRoute(method string, path string, handler gin.HandlerFunc)
	EmitSocketEvent(room string, event string, payload interface{})
	GetStatus() PluginStatus
}

// WatinkPlugin is the interface that every backend plugin must implement
type WatinkPlugin interface {
	GetManifest() PluginManifest
	OnInstall(core WatinkCore) error
	OnActivate(core WatinkCore) error
	OnDeactivate(core WatinkCore) error
}
