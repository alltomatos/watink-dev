package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

// Structures for JSON responses
type Plugin struct {
	ID          string  `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Version     string  `json:"version"`
	Type        string  `json:"type"`     // free, premium
	Category    string  `json:"category"` // utility, channel, etc
	Price       float64 `json:"price"`
}

type CatalogResponse struct {
	Offline bool     `json:"offline"`
	Plugins []Plugin `json:"plugins"`
}

type InstalledResponse struct {
	Active []string `json:"active"`
}

type VersionResponse struct {
	Service     string `json:"service"`
	Version     string `json:"version"`
	LastUpdated string `json:"lastUpdated"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	r := mux.NewRouter()

	// Health Check
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Version Endpoint (used by VersionDashboard)
	// Frontend calls /plugins/version -> Traefik strips /plugins -> Backend sees /version
	r.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		currentVersion := "1.0.32"
		// Try to read from VERSION file if exists
		data, err := os.ReadFile("VERSION")
		if err == nil {
			currentVersion = string(data)
		}

		resp := VersionResponse{
			Service:     "plugin-manager",
			Version:     currentVersion,
			LastUpdated: time.Now().Format(time.RFC3339),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}).Methods("GET")

	// API V1 Routes
	api := r.PathPrefix("/api/v1/plugins").Subrouter()

	// Catalog Handler
	api.HandleFunc("/catalog", func(w http.ResponseWriter, r *http.Request) {
		// Mock Catalog
		catalog := CatalogResponse{
			Offline: false,
			Plugins: []Plugin{
				{
					ID:          "1",
					Slug:        "plugin-smtp",
					Name:        "SMTP Plugin",
					Description: "Envio de e-mails transacionais via RabbitMQ",
					Version:     "1.0.0",
					Type:        "free",
					Category:    "utility",
					Price:       0,
				},
				{
					ID:          "2",
					Slug:        "clientes",
					Name:        "Gestão de Clientes",
					Description: "CRM Básico para gestão de contatos",
					Version:     "1.2.0",
					Type:        "free",
					Category:    "crm",
					Price:       0,
				},
				{
					ID:          "3",
					Slug:        "helpdesk",
					Name:        "Helpdesk Pro",
					Description: "Sistema de tickets e atendimento",
					Version:     "2.0.0",
					Type:        "premium",
					Category:    "support",
					Price:       49.90,
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(catalog)
	}).Methods("GET")

	// Installed Handler
	api.HandleFunc("/installed", func(w http.ResponseWriter, r *http.Request) {
		// Mock Installed (Assuming SMTP is installed as we recovered it)
		installed := InstalledResponse{
			Active: []string{"plugin-smtp"},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(installed)
	}).Methods("GET")

	log.Printf("Plugin Manager running on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
