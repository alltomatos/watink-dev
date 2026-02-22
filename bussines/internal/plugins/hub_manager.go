package plugins

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type HubPlugin struct {
	ID          string  `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Version     string  `json:"version"`
	Type        string  `json:"type"`
	Category    string  `json:"category"`
	Price       float64 `json:"price"`
	IconURL     string  `json:"iconUrl"`
}

type CatalogResponse struct {
	Offline bool        `json:"offline"`
	Plugins []HubPlugin `json:"plugins"`
}

type InstalledResponse struct {
	Active       []string               `json:"active"`
	Statuses     map[string]string      `json:"statuses"`
	Entitlements map[string]interface{} `json:"entitlements,omitempty"`
}

type CreateCheckoutResponse struct {
	CheckoutURL string `json:"checkoutUrl"`
}

type tenantPluginsStore map[string][]string

type licenseStatusStore map[string]string

type HubManager struct {
	HubURL                 string
	CoreVersion            string
	InstanceIDFile         string
	TenantPluginsFile      string
	LicenseStatusFile      string
	EntitlementsStatusFile string

	httpClient *http.Client

	tenantPluginsMu      sync.Mutex
	licenseStatusMu      sync.Mutex
	entitlementsStatusMu sync.Mutex

	instanceID string
}

var defaultHubManager *HubManager

func NewHubManager() *HubManager {
	baseDir := "."
	if dataDir := os.Getenv("WATINK_DATA_DIR"); dataDir != "" {
		baseDir = dataDir
	}

	return &HubManager{
		HubURL:                 getenv("PLUGIN_HUB_URL", "http://localhost:8090/api/v1/hub"),
		CoreVersion:            resolveCoreVersion(baseDir),
		InstanceIDFile:         filepath.Join(baseDir, ".instance_id"),
		TenantPluginsFile:      filepath.Join(baseDir, ".tenant_plugins.json"),
		LicenseStatusFile:      filepath.Join(baseDir, ".license_status.json"),
		EntitlementsStatusFile: filepath.Join(baseDir, ".entitlements_status.json"),
		httpClient:             &http.Client{Timeout: 12 * time.Second},
	}
}

func InitHubManager() *HubManager {
	defaultHubManager = NewHubManager()
	defaultHubManager.instanceID = defaultHubManager.getInstanceID()
	defaultHubManager.startHeartbeat()
	return defaultHubManager
}

func GetHubManager() *HubManager { return defaultHubManager }

func (m *HubManager) GetInstanceID() string { return m.instanceID }

func (m *HubManager) GetCatalog() CatalogResponse {
	req, _ := http.NewRequest(http.MethodGet, m.HubURL+"/catalog", nil)
	resp, err := m.httpClient.Do(req)
	if err != nil {
		return CatalogResponse{Offline: true, Plugins: []HubPlugin{}}
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return CatalogResponse{Offline: true, Plugins: []HubPlugin{}}
	}

	var hubResp struct {
		Plugins []HubPlugin `json:"plugins"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&hubResp); err != nil {
		return CatalogResponse{Offline: true, Plugins: []HubPlugin{}}
	}

	return CatalogResponse{Offline: false, Plugins: hubResp.Plugins}
}

func (m *HubManager) GetInstalled(tenantID string) InstalledResponse {
	store := m.readTenantPlugins()
	active := store[tenantID]
	if active == nil {
		active = []string{}
	}
	statuses := m.readLicenseStatus()
	entitlements := m.readEntitlementsStatus()
	return InstalledResponse{Active: active, Statuses: statuses, Entitlements: entitlements}
}

func (m *HubManager) CreateCheckout(slug string) (CreateCheckoutResponse, int, error) {
	payload, _ := json.Marshal(map[string]string{
		"slug":       slug,
		"instanceId": m.instanceID,
	})

	resp, err := m.httpClient.Post(m.HubURL+"/checkout", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return CreateCheckoutResponse{}, http.StatusBadGateway, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return CreateCheckoutResponse{}, resp.StatusCode, fmt.Errorf("hub checkout status %d", resp.StatusCode)
	}

	var out CreateCheckoutResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return CreateCheckoutResponse{}, http.StatusBadGateway, err
	}
	return out, http.StatusOK, nil
}

func (m *HubManager) RegisterInstance(meta map[string]string) error {
	payload := map[string]string{
		"instanceId": m.instanceID,
		"version":    m.CoreVersion,
	}
	for k, v := range meta {
		payload[k] = v
	}

	body, _ := json.Marshal(payload)
	resp, err := m.httpClient.Post(m.HubURL+"/register", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("hub register status %d", resp.StatusCode)
	}
	return nil
}

func (m *HubManager) startHeartbeat() {
	go func() {
		ticker := time.NewTicker(15 * time.Minute)
		defer ticker.Stop()

		m.sendHeartbeat()
		for range ticker.C {
			m.sendHeartbeat()
		}
	}()
}

func (m *HubManager) sendHeartbeat() {
	payload, _ := json.Marshal(map[string]string{
		"instanceId": m.instanceID,
		"version":    m.CoreVersion,
	})

	resp, err := m.httpClient.Post(m.HubURL+"/heartbeat", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Printf("⚠️ plugin hub heartbeat failed: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("⚠️ plugin hub heartbeat bad status: %d", resp.StatusCode)
		return
	}

	var hubResp struct {
		Licenses     map[string]string      `json:"licenses"`
		Entitlements map[string]interface{} `json:"entitlements"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&hubResp); err != nil {
		return
	}

	m.licenseStatusMu.Lock()
	if err := m.writeLicenseStatus(hubResp.Licenses); err != nil {
		log.Printf("⚠️ failed writing license status: %v", err)
	}
	m.licenseStatusMu.Unlock()

	m.entitlementsStatusMu.Lock()
	if err := m.writeEntitlementsStatus(hubResp.Entitlements); err != nil {
		log.Printf("⚠️ failed writing entitlements status: %v", err)
	}
	m.entitlementsStatusMu.Unlock()
}

func (m *HubManager) getInstanceID() string {
	data, err := os.ReadFile(m.InstanceIDFile)
	if err == nil && len(bytes.TrimSpace(data)) > 0 {
		return string(bytes.TrimSpace(data))
	}
	newID := fmt.Sprintf("INST-%d-%x", time.Now().Unix(), time.Now().UnixNano())
	_ = os.WriteFile(m.InstanceIDFile, []byte(newID), 0644)
	return newID
}

func (m *HubManager) readTenantPlugins() tenantPluginsStore {
	m.tenantPluginsMu.Lock()
	defer m.tenantPluginsMu.Unlock()

	data, err := os.ReadFile(m.TenantPluginsFile)
	if err != nil {
		return tenantPluginsStore{}
	}
	var store tenantPluginsStore
	_ = json.Unmarshal(data, &store)
	if store == nil {
		return tenantPluginsStore{}
	}
	return store
}

func (m *HubManager) readLicenseStatus() licenseStatusStore {
	m.licenseStatusMu.Lock()
	defer m.licenseStatusMu.Unlock()

	data, err := os.ReadFile(m.LicenseStatusFile)
	if err != nil {
		return licenseStatusStore{}
	}
	var store licenseStatusStore
	_ = json.Unmarshal(data, &store)
	if store == nil {
		return licenseStatusStore{}
	}
	return store
}

func (m *HubManager) writeLicenseStatus(store licenseStatusStore) error {
	payload, _ := json.MarshalIndent(store, "", "  ")
	return os.WriteFile(m.LicenseStatusFile, payload, 0644)
}

func (m *HubManager) readEntitlementsStatus() map[string]interface{} {
	m.entitlementsStatusMu.Lock()
	defer m.entitlementsStatusMu.Unlock()

	data, err := os.ReadFile(m.EntitlementsStatusFile)
	if err != nil {
		return map[string]interface{}{}
	}

	var store map[string]interface{}
	_ = json.Unmarshal(data, &store)
	if store == nil {
		return map[string]interface{}{}
	}
	return store
}

func (m *HubManager) writeEntitlementsStatus(store map[string]interface{}) error {
	if store == nil {
		store = map[string]interface{}{}
	}
	payload, _ := json.MarshalIndent(store, "", "  ")
	return os.WriteFile(m.EntitlementsStatusFile, payload, 0644)
}

func resolveCoreVersion(baseDir string) string {
	if v := getenv("WATINK_CORE_VERSION", ""); v != "" {
		return v
	}

	candidates := []string{
		getenv("WATINK_VERSION_FILE", ""),
		filepath.Join(baseDir, "VERSION"),
		filepath.Join(baseDir, "..", "frontend", "public", "version.json"),
		"/opt/watink/app/VERSION",
	}

	for _, p := range candidates {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if b, err := os.ReadFile(p); err == nil {
			raw := strings.TrimSpace(string(b))
			if raw == "" {
				continue
			}

			if strings.HasSuffix(p, ".json") {
				var payload map[string]interface{}
				if err := json.Unmarshal(b, &payload); err == nil {
					if vv, ok := payload["version"].(string); ok && strings.TrimSpace(vv) != "" {
						return strings.TrimPrefix(strings.TrimSpace(vv), "v")
					}
				}
			}

			return strings.TrimPrefix(raw, "v")
		}
	}

	return "2.0.0-business"
}

func getenv(k, d string) string {
	v := os.Getenv(k)
	if v == "" {
		return d
	}
	return v
}
