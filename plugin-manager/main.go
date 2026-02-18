package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

// Structures for Hub Communication
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
	Active   []string          `json:"active"`
	Statuses map[string]string `json:"statuses"`
}

type CheckoutRequest struct {
	Slug string `json:"slug"`
}

type CreateCheckoutPayload struct {
	Slug       string `json:"slug"`
	InstanceID string `json:"instanceId"`
}

type CreateCheckoutResponse struct {
	CheckoutURL string `json:"checkoutUrl"`
}

// Global Config
const (
	HubURL            = "http://localhost:8090/api/v1/hub"
	InstanceFile      = ".instance_id"
	TenantPluginsFile = ".tenant_plugins.json"
	LicenseStatusFile = ".license_status.json"
	CoreVersion       = "2.0.0-bussines"
)

var (
	tenantPluginsMu sync.Mutex
	licenseStatusMu sync.Mutex
)

type tenantPluginsStore map[string][]string
type licenseStatusStore map[string]string

func readTenantPlugins() tenantPluginsStore {
	data, err := os.ReadFile(TenantPluginsFile)
	if err != nil {
		return tenantPluginsStore{}
	}
	var store tenantPluginsStore
	json.Unmarshal(data, &store)
	if store == nil {
		return tenantPluginsStore{}
	}
	return store
}

func readLicenseStatus() licenseStatusStore {
	data, err := os.ReadFile(LicenseStatusFile)
	if err != nil {
		return licenseStatusStore{}
	}
	var store licenseStatusStore
	json.Unmarshal(data, &store)
	if store == nil {
		return licenseStatusStore{}
	}
	return store
}

func writeLicenseStatus(store licenseStatusStore) error {
	payload, _ := json.MarshalIndent(store, "", "  ")
	return os.WriteFile(LicenseStatusFile, payload, 0644)
}

func getInstanceID() string {
	data, err := os.ReadFile(InstanceFile)
	if err == nil {
		return string(data)
	}
	newID := fmt.Sprintf("INST-%d-%x", time.Now().Unix(), time.Now().UnixNano())
	os.WriteFile(InstanceFile, []byte(newID), 0644)
	return newID
}

// StartHeartbeat inicia a rotina de sinal vital para o Hub
func StartHeartbeat(instanceID string) {
	go func() {
		for {
			payload, _ := json.Marshal(map[string]string{
				"instanceId": instanceID,
				"version":    CoreVersion,
			})
			resp, err := http.Post(HubURL+"/heartbeat", "application/json", bytes.NewBuffer(payload))
			if err == nil {
				defer resp.Body.Close()
				var hubResp struct {
					InstanceStatus string            `json:"instanceStatus"`
					Licenses       map[string]string `json:"licenses"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&hubResp); err == nil {
					licenseStatusMu.Lock()
					writeLicenseStatus(hubResp.Licenses)
					licenseStatusMu.Unlock()
					log.Printf("💓 Heartbeat OK. Syncing %d license statuses.", len(hubResp.Licenses))
				}
			} else {
				log.Printf("⚠️ Hub heartbeat failed: %v", err)
			}
			time.Sleep(15 * time.Minute)
		}
	}()
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	instanceID := getInstanceID()
	log.Printf("🦞 Local Plugin Manager starting with ID: %s", instanceID)

	// Inicia telemetria bussines
	StartHeartbeat(instanceID)

	r := mux.NewRouter()

	// 1. Proxy Catalog from Hub
	r.HandleFunc("/api/v1/plugins/catalog", func(w http.ResponseWriter, r *http.Request) {
		resp, err := http.Get(HubURL + "/catalog")
		if err != nil {
			json.NewEncoder(w).Encode(CatalogResponse{Offline: true, Plugins: []HubPlugin{}})
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		var hubResp struct {
			Plugins []HubPlugin `json:"plugins"`
		}
		json.NewDecoder(resp.Body).Decode(&hubResp)
		json.NewEncoder(w).Encode(CatalogResponse{Offline: false, Plugins: hubResp.Plugins})
	}).Methods("GET")

	// 2. Installed plugins
	r.HandleFunc("/api/v1/plugins/installed", func(w http.ResponseWriter, r *http.Request) {
		tenantID := r.Header.Get("x-tenant-id")
		store := readTenantPlugins()
		active := store[tenantID]
		if active == nil {
			active = []string{}
		}
		statuses := readLicenseStatus()
		json.NewEncoder(w).Encode(InstalledResponse{
			Active:   active,
			Statuses: statuses,
		})
	}).Methods("GET")

	// 3. Checkout
	r.HandleFunc("/api/v1/plugins/checkout", func(w http.ResponseWriter, r *http.Request) {
		var req CheckoutRequest
		json.NewDecoder(r.Body).Decode(&req)
		payload, _ := json.Marshal(CreateCheckoutPayload{
			Slug:       req.Slug,
			InstanceID: instanceID,
		})
		resp, err := http.Post(HubURL+"/checkout", "application/json", bytes.NewBuffer(payload))
		if err != nil {
			http.Error(w, "Hub unavailable", 502)
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		var checkoutResp CreateCheckoutResponse
		json.NewDecoder(resp.Body).Decode(&checkoutResp)
		json.NewEncoder(w).Encode(checkoutResp)
	}).Methods("POST")

	// 4. Instance Info
	r.HandleFunc("/api/v1/plugins/instance", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"instanceId": instanceID})
	}).Methods("GET")

	log.Printf("🚀 Local Plugin Manager running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
