// plugin_handler.go

package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/alltomatos/watink/plugin-manager/internal/config"
	"github.com/gin-gonic/gin"
)

// PluginHandler handles plugin-related HTTP requests
type PluginHandler struct {
	db  *sql.DB
	cfg *config.Config
}

// NewPluginHandler creates a new plugin handler
func NewPluginHandler(db *sql.DB, cfg *config.Config) *PluginHandler {
	return &PluginHandler{db: db, cfg: cfg}
}

// SupabasePlugin represents the structure returned by Supabase
type SupabasePlugin struct {
	ID          string  `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Version     string  `json:"version"`
	Price       float64 `json:"price"`
	IconURL     string  `json:"icon_url"`
	Category    string  `json:"category"`
}

// Helper to get Tenant ID: prefer header from proxy, fallback to DB
func (h *PluginHandler) getTenantID(c *gin.Context) (string, error) {
	tenantHeader := c.Request.Header.Get("x-tenant-id")
	if tenantHeader != "" {
		return tenantHeader, nil
	}
	var id string
	err := h.db.QueryRow(`SELECT "id" FROM "Tenants" LIMIT 1`).Scan(&id)
	return id, err
}

// Helper to get installed plugins status
func (h *PluginHandler) getInstallations(tenantID string) (map[string]string, error) {
	rows, err := h.db.Query(`
		SELECT "pluginId", "status" 
		FROM "PluginInstallations" 
		WHERE "tenantId" = $1`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	installations := make(map[string]string)
	for rows.Next() {
		var pID, status string
		if err := rows.Scan(&pID, &status); err == nil {
			installations[pID] = status
		}
	}
	return installations, nil
}

// Sync plugin metadata to local Plugins table
func (h *PluginHandler) syncPlugin(p SupabasePlugin) error {
	// Check if exists
	var existsID string
	err := h.db.QueryRow(`SELECT "id" FROM "Plugins" WHERE "id" = $1`, p.ID).Scan(&existsID)
	if err == sql.ErrNoRows {
		// Insert
		_, err = h.db.Exec(`
			INSERT INTO "Plugins" ("id", "slug", "name", "description", "version", "type", "price", "iconUrl", "category", "createdAt", "updatedAt")
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
			p.ID, p.Slug, p.Name, p.Description, p.Version, "free", p.Price, p.IconURL, p.Category)
		return err
	}

	// Upsert/Update
	_, err = h.db.Exec(`
        UPDATE "Plugins" 
        SET "name"=$2, "description"=$3, "version"=$4, "price"=$5, "iconUrl"=$6, "category"=$7, "updatedAt"=NOW()
        WHERE "id" = $1`,
		p.ID, p.Name, p.Description, p.Version, p.Price, p.IconURL, p.Category)

	return err
}

// Helper to get all local plugins for offline fallback
func (h *PluginHandler) getAllLocalPlugins() ([]SupabasePlugin, error) {
	rows, err := h.db.Query(`SELECT "id", "slug", "name", COALESCE("description", ''), "version", COALESCE("price", 0)::float8, COALESCE("iconUrl", ''), COALESCE("category", '') FROM "Plugins"`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plugins []SupabasePlugin
	for rows.Next() {
		var p SupabasePlugin
		if err := rows.Scan(&p.ID, &p.Slug, &p.Name, &p.Description, &p.Version, &p.Price, &p.IconURL, &p.Category); err == nil {
			plugins = append(plugins, p)
		}
	}
	return plugins, nil
}

// GetCatalog returns all available plugins from the catalog
func (h *PluginHandler) GetCatalog(c *gin.Context) {
	// 1. Initial State: Load Local Plugins (Seeded/Bundled)
	localPlugins, err := h.getAllLocalPlugins()
	if err != nil {
		localPlugins = []SupabasePlugin{}
	}

	// Map for merging (ID -> Plugin)
	pluginMap := make(map[string]SupabasePlugin)
	for _, p := range localPlugins {
		pluginMap[p.ID] = p
	}

	// 2. Try Fetch Remote (Manager)
	usingFallback := true // Default to fallback mode until remote succeeds
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest("GET", h.cfg.MarketplaceURL+"/api/marketplace_plugins", nil)

	if err == nil {
		req.Header.Add("apikey", h.cfg.MarketplaceKey)
		req.Header.Add("Authorization", "Bearer "+h.cfg.MarketplaceKey)
		resp, err := client.Do(req)

		if err == nil && resp.StatusCode == http.StatusOK {
			defer resp.Body.Close()
			var wrapper struct {
				Plugins []SupabasePlugin `json:"plugins"`
			}
			if json.NewDecoder(resp.Body).Decode(&wrapper) == nil {
				usingFallback = false // Remote success
				// 3. Merge Remote into Local
				for _, p := range wrapper.Plugins {
					pluginMap[p.ID] = p
					// Sync to Local DB for future offlining
					go h.syncPlugin(p)
				}
			}
		}
	}

	// 4. Enrich with Local Installation Status
	tenantID, _ := h.getTenantID(c)
	installedMap := make(map[string]string)
	if tenantID != "" {
		rows, err := h.db.Query(`SELECT "pluginId", "status" FROM "PluginInstallations" WHERE "tenantId"=$1`, tenantID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var pid, status string
				rows.Scan(&pid, &status)
				installedMap[pid] = status
			}
		}
	}

	// 5. Build Response
	var response []gin.H
	for _, p := range pluginMap {
		// Slug Normalization
		slug := p.Slug
		if p.Name == "Plugin de Clientes" {
			slug = "clientes"
		}
		if p.Name == "Plugin de Helpdesk" {
			slug = "helpdesk"
		}
		if slug == "" {
			slug = "plugin-" + p.ID[:8]
		}

		status := "not_installed"
		if s, ok := installedMap[p.ID]; ok {
			status = s
		}

		pType := "free"
		if p.Price > 0 {
			pType = "premium"
		}

		response = append(response, gin.H{
			"id":          p.ID,
			"slug":        slug,
			"name":        p.Name,
			"description": p.Description,
			"version":     p.Version,
			"type":        pType,
			"price":       p.Price,
			"iconUrl":     p.IconURL, // Use raw iconURL or proxy if needed
			"category":    p.Category,
			"status":      status,
			"offline":     usingFallback,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"plugins": response,
		"offline": usingFallback,
	})
}

// GetInstalled returns active plugins for the current tenant (Sidebar consumption)
func (h *PluginHandler) GetInstalled(c *gin.Context) {
	tenantID, err := h.getTenantID(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tenant not found"})
		return
	}

	// Query active plugins
	rows, err := h.db.Query(`
        SELECT P."slug", PI."status"
        FROM "PluginInstallations" PI
        JOIN "Plugins" P ON PI."pluginId" = P."id"
        WHERE PI."tenantId" = $1 AND PI."status" = 'active'
    `, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Error"})
		return
	}
	defer rows.Close()

	var activeSlugs []string
	for rows.Next() {
		var slug, status string
		rows.Scan(&slug, &status)
		activeSlugs = append(activeSlugs, slug)
	}

	c.JSON(http.StatusOK, gin.H{"active": activeSlugs})
}

// Request body for activation
type ActivateRequest struct {
	LicenseKey string `json:"licenseKey"`
}

// Verify license with Watink Manager
func (h *PluginHandler) verifyLicense(c *gin.Context, pluginID, key string) error {
	if key == "" {
		return fmt.Errorf("license key required for premium plugins")
	}

	tenantID, err := h.getTenantID(c)
	if err != nil {
		return fmt.Errorf("could not determine tenant ID")
	}

	client := &http.Client{Timeout: 10 * time.Second}
	// Align with Spec: /api/verify_license
	url := fmt.Sprintf("%s/api/verify_license", h.cfg.MarketplaceURL)

	// Spec: { "licenseKey": "...", "tenantId": "..." }
	// Sending pluginId as well just in case, but spec emphasizes licenseKey+tenantId
	payload := map[string]string{
		"licenseKey": key,
		"tenantId":   tenantID,
		"pluginId":   pluginID, // Optional based on spec, but good context
	}
	jsonData, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, strings.NewReader(string(jsonData)))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Add("apikey", h.cfg.MarketplaceKey)
	req.Header.Add("Authorization", "Bearer "+h.cfg.MarketplaceKey)

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to contact license server: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("license verification failed: status %d", resp.StatusCode)
	}

	// Spec Response: { "status": "VALID" } or { "status": "INVALID" }
	var result struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("invalid response from license server")
	}

	if result.Status != "VALID" {
		msg := result.Reason
		if msg == "" {
			msg = "unknown reason"
		}
		return fmt.Errorf("invalid license: %s", msg)
	}

	return nil
}

// Activate activates an installed plugin
func (h *PluginHandler) Activate(c *gin.Context) {
	pluginID := c.Param("id")
	idOrSlug := pluginID
	var req ActivateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Optional binding, body might be empty for free plugins
	}

	tenantID, err := h.getTenantID(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tenant not found"})
		return
	}

	// 1. Fetch from Supabase ensure data sync
	client := &http.Client{Timeout: 10 * time.Second}
	// Decide whether param is UUID or slug
	isUUID := len(idOrSlug) == 36 && strings.Count(idOrSlug, "-") == 4
	queryField := "id"
	if !isUUID {
		queryField = "slug"
	}
	reqURL, _ := http.NewRequest("GET", fmt.Sprintf("%s/rest/v1/marketplace_plugins?%s=eq.%s&select=*", h.cfg.MarketplaceURL, queryField, idOrSlug), nil)
	reqURL.Header.Add("apikey", h.cfg.MarketplaceKey)
	reqURL.Header.Add("Authorization", "Bearer "+h.cfg.MarketplaceKey)
	resp, err := client.Do(reqURL)

	// Handle Offline / Not Found
	var p SupabasePlugin
	if err != nil || resp.StatusCode != 200 {
		// Try local cache if offline
		var errLoc error
		if isUUID {
			errLoc = h.db.QueryRow(`SELECT "id", "slug", "name", COALESCE("description", ''), "version", COALESCE("price", 0)::float8, COALESCE("iconUrl", ''), COALESCE("category", '') FROM "Plugins" WHERE "id"=$1`, idOrSlug).Scan(
				&p.ID, &p.Slug, &p.Name, &p.Description, &p.Version, &p.Price, &p.IconURL, &p.Category)
		} else {
			errLoc = h.db.QueryRow(`SELECT "id", "slug", "name", COALESCE("description", ''), "version", COALESCE("price", 0)::float8, COALESCE("iconUrl", ''), COALESCE("category", '') FROM "Plugins" WHERE "slug"=$1`, idOrSlug).Scan(
				&p.ID, &p.Slug, &p.Name, &p.Description, &p.Version, &p.Price, &p.IconURL, &p.Category)
		}
		if errLoc != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin not found (online or offline)"})
			return
		}
	} else {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var results []SupabasePlugin
		json.Unmarshal(body, &results)
		if len(results) == 0 {
			// Remote respondeu 200 porém não encontrou o plugin.
			// Fallback para cache local.
			var errLoc error
			if isUUID {
				errLoc = h.db.QueryRow(`SELECT "id", "slug", "name", COALESCE("description", ''), "version", COALESCE("price", 0)::float8, COALESCE("iconUrl", ''), COALESCE("category", '') FROM "Plugins" WHERE "id"=$1`, idOrSlug).Scan(
					&p.ID, &p.Slug, &p.Name, &p.Description, &p.Version, &p.Price, &p.IconURL, &p.Category)
			} else {
				errLoc = h.db.QueryRow(`SELECT "id", "slug", "name", COALESCE("description", ''), "version", COALESCE("price", 0)::float8, COALESCE("iconUrl", ''), COALESCE("category", '') FROM "Plugins" WHERE "slug"=$1`, idOrSlug).Scan(
					&p.ID, &p.Slug, &p.Name, &p.Description, &p.Version, &p.Price, &p.IconURL, &p.Category)
			}
			if errLoc != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found (remote empty and no local cache)"})
				return
			}
		} else {
			p = results[0]
		}
	}

	// Slug Fix
	if p.Name == "Plugin de Clientes" {
		p.Slug = "clientes"
	}
	if p.Name == "Plugin de Helpdesk" {
		p.Slug = "helpdesk"
	}
	if p.Slug == "" {
		p.Slug = "plugin-" + p.ID[:8]
	}

	// SECURITY CHECK: Verify License if Premium
	if p.Price > 0 {
		if err := h.verifyLicense(c, p.ID, req.LicenseKey); err != nil {
			c.JSON(http.StatusPaymentRequired, gin.H{"error": err.Error()})
			return
		}
	}

	// 2. Sync to Plugins table (if online)
	// If we loaded from cache, this is redundant but harmless.
	err = h.syncPlugin(p)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sync plugin: " + err.Error()})
		return
	}

	// 3. Upsert Installation with status='active'
	_, err = h.db.Exec(`
        INSERT INTO "PluginInstallations" ("id", "tenantId", "pluginId", "status", "installedAt", "activatedAt")
        VALUES (gen_random_uuid(), $1, $2, 'active', NOW(), NOW())
        ON CONFLICT ("tenantId", "pluginId") 
        DO UPDATE SET "status"='active', "activatedAt"=NOW()`,
		tenantID, p.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Plugin activated", "pluginId": pluginID, "status": "active"})
}

// Deactivate deactivates an installed plugin
func (h *PluginHandler) Deactivate(c *gin.Context) {
	idOrSlug := c.Param("id")

	tenantID, err := h.getTenantID(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tenant not found"})
		return
	}

	// Resolve plugin by UUID or slug (remote first, fallback local)
	client := &http.Client{Timeout: 10 * time.Second}
	isUUID := len(idOrSlug) == 36 && strings.Count(idOrSlug, "-") == 4
	queryField := "id"
	if !isUUID {
		queryField = "slug"
	}

	reqURL, _ := http.NewRequest("GET", fmt.Sprintf("%s/rest/v1/marketplace_plugins?%s=eq.%s&select=*", h.cfg.MarketplaceURL, queryField, idOrSlug), nil)
	reqURL.Header.Add("apikey", h.cfg.MarketplaceKey)
	reqURL.Header.Add("Authorization", "Bearer "+h.cfg.MarketplaceKey)
	resp, err := client.Do(reqURL)

	var p SupabasePlugin
	if err != nil || resp.StatusCode != 200 {
		// Offline or not found remotely: try local cache
		var errLoc error
		if isUUID {
			errLoc = h.db.QueryRow(`SELECT "id", "slug", "name", COALESCE("description", ''), "version", COALESCE("price", 0)::float8, COALESCE("iconUrl", ''), COALESCE("category", '') FROM "Plugins" WHERE "id"=$1`, idOrSlug).Scan(
				&p.ID, &p.Slug, &p.Name, &p.Description, &p.Version, &p.Price, &p.IconURL, &p.Category)
		} else {
			errLoc = h.db.QueryRow(`SELECT "id", "slug", "name", COALESCE("description", ''), "version", COALESCE("price", 0)::float8, COALESCE("iconUrl", ''), COALESCE("category", '') FROM "Plugins" WHERE "slug"=$1`, idOrSlug).Scan(
				&p.ID, &p.Slug, &p.Name, &p.Description, &p.Version, &p.Price, &p.IconURL, &p.Category)
		}
		if errLoc != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found (online or offline)"})
			return
		}
	} else {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var results []SupabasePlugin
		json.Unmarshal(body, &results)
		if len(results) == 0 {
			// Remote empty, fallback local
			var errLoc error
			if isUUID {
				errLoc = h.db.QueryRow(`SELECT "id", "slug", "name", COALESCE("description", ''), "version", COALESCE("price", 0)::float8, COALESCE("iconUrl", ''), COALESCE("category", '') FROM "Plugins" WHERE "id"=$1`, idOrSlug).Scan(
					&p.ID, &p.Slug, &p.Name, &p.Description, &p.Version, &p.Price, &p.IconURL, &p.Category)
			} else {
				errLoc = h.db.QueryRow(`SELECT "id", "slug", "name", COALESCE("description", ''), "version", COALESCE("price", 0)::float8, COALESCE("iconUrl", ''), COALESCE("category", '') FROM "Plugins" WHERE "slug"=$1`, idOrSlug).Scan(
					&p.ID, &p.Slug, &p.Name, &p.Description, &p.Version, &p.Price, &p.IconURL, &p.Category)
			}
			if errLoc != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found (remote empty and no local cache)"})
				return
			}
		} else {
			p = results[0]
		}
	}

	// Slug normalization
	if p.Name == "Plugin de Clientes" {
		p.Slug = "clientes"
	}
	if p.Name == "Plugin de Helpdesk" {
		p.Slug = "helpdesk"
	}
	if p.Slug == "" {
		p.Slug = "plugin-" + p.ID[:8]
	}

	// Upsert installation as inactive to avoid 500 if not previously installed
	_, err = h.db.Exec(`
        INSERT INTO "PluginInstallations" ("id", "tenantId", "pluginId", "status", "installedAt", "activatedAt")
        VALUES (gen_random_uuid(), $1, $2, 'inactive', NOW(), NULL)
        ON CONFLICT ("tenantId", "pluginId")
        DO UPDATE SET "status"='inactive'`,
		tenantID, p.ID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deactivate: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Plugin deactivated", "pluginId": p.ID, "status": "inactive"})
}

// GetIcon proxies the plugin icon from Supabase
func (h *PluginHandler) GetIcon(c *gin.Context) {
	pluginID := c.Param("id")

	// 1. Fetch metadata to get real URL
	client := &http.Client{}
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/rest/v1/marketplace_plugins?id=eq.%s&select=icon_url", h.cfg.MarketplaceURL, pluginID), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Error"})
		return
	}
	req.Header.Add("apikey", h.cfg.MarketplaceKey)
	req.Header.Add("Authorization", "Bearer "+h.cfg.MarketplaceKey)

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}
	defer resp.Body.Close()

	var result []struct {
		IconURL string `json:"icon_url"`
	}
	// Decode JSON
	body, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(body, &result); err != nil || len(result) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Icon not found"})
		return
	}

	iconURL := result[0].IconURL
	// Fix broken URL
	if strings.Contains(iconURL, "plugins.watink.com") {
		parts := strings.Split(iconURL, "plugins.watink.com")
		if len(parts) > 1 {
			path := parts[1]
			iconURL = fmt.Sprintf("%s/storage/v1/object/public/plugins%s", h.cfg.MarketplaceURL, path)
		}
	} else if !strings.HasPrefix(iconURL, "http") {
		iconURL = fmt.Sprintf("%s/storage/v1/object/public/plugins/%s", h.cfg.MarketplaceURL, strings.TrimPrefix(iconURL, "/"))
	}

	// 2. Fetch Image
	imgReq, _ := http.NewRequest("GET", iconURL, nil)
	imgResp, err := client.Do(imgReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to fetch image"})
		return
	}
	defer imgResp.Body.Close()

	// Stream to client
	c.DataFromReader(http.StatusOK, imgResp.ContentLength, imgResp.Header.Get("Content-Type"), imgResp.Body, nil)
}

// Install - For now just stub or alias
func (h *PluginHandler) Install(c *gin.Context) {
	h.Activate(c)
}

// Uninstall removes an installed plugin
func (h *PluginHandler) Uninstall(c *gin.Context) {
	pluginID := c.Param("id")
	tenantID, _ := h.getTenantID(c)
	h.db.Exec(`DELETE FROM "PluginInstallations" WHERE "pluginId"=$1 AND "tenantId"=$2`, pluginID, tenantID)
	c.JSON(http.StatusOK, gin.H{"message": "Plugin uninstalled", "pluginId": pluginID})
}
