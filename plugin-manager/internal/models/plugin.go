package models

import "time"

// Plugin represents a plugin in the catalog
type Plugin struct {
	ID          string    `json:"id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Version     string    `json:"version"`
	Type        string    `json:"type"` // "free" or "premium"
	Price       *float64  `json:"price,omitempty"`
	IconURL     string    `json:"iconUrl"`
	DownloadURL string    `json:"downloadUrl"`
	Category    string    `json:"category"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// PluginInstallation represents an installed plugin for a tenant
type PluginInstallation struct {
	ID                string     `json:"id"`
	TenantID          string     `json:"tenantId"`
	PluginID          string     `json:"pluginId"`
	InstalledVersion  string     `json:"installedVersion"`
	Status            string     `json:"status"` // "active", "inactive", "pending"
	LicenseKey        *string    `json:"licenseKey,omitempty"`
	LicenseValidUntil *time.Time `json:"licenseValidUntil,omitempty"`
	InstalledAt       time.Time  `json:"installedAt"`
	ActivatedAt       *time.Time `json:"activatedAt,omitempty"`
}

// License represents a plugin license
type License struct {
	ID                 string     `json:"id"`
	LicenseKey         string     `json:"licenseKey"`
	PluginID           string     `json:"pluginId"`
	CustomerEmail      string     `json:"customerEmail"`
	MaxActivations     int        `json:"maxActivations"`
	CurrentActivations int        `json:"currentActivations"`
	ValidUntil         *time.Time `json:"validUntil,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
}
