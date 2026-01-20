package main

import (
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/watink/plugin-manager/internal/config"
	"github.com/watink/plugin-manager/internal/database"
	"github.com/watink/plugin-manager/internal/handlers"
)

func main() {
	cfg := config.Load()

	// Initialize Database Connection
	database.InitDB(cfg.DatabaseURL)

	r := mux.NewRouter()
	r.Use(handlers.CORSMiddleware(cfg))

	// Health Check
	r.HandleFunc("/health", handlers.HealthHandler).Methods("GET")

	// Version Endpoint
	r.HandleFunc("/version", handlers.VersionHandler).Methods("GET", "OPTIONS")

	// Public API Routes (no auth required)
	r.HandleFunc("/api/v1/plugins/catalog", handlers.CatalogHandler).Methods("GET", "OPTIONS")

	// Authenticated API V1 Routes
	api := r.PathPrefix("/api/v1/plugins").Subrouter()
	api.Use(handlers.AuthMiddleware(cfg))

	// Installed Handler (requires auth)
	api.HandleFunc("/installed", handlers.InstalledHandler).Methods("GET", "OPTIONS")

	// Plugin activation/deactivation routes (requires auth)
	api.HandleFunc("/{slug}/activate", handlers.ActivateHandler).Methods("POST", "OPTIONS")
	api.HandleFunc("/{slug}/deactivate", handlers.DeactivateHandler).Methods("POST", "OPTIONS")
	api.HandleFunc("/{slug}/install", handlers.InstallHandler).Methods("POST", "OPTIONS")

	log.Printf("Plugin Manager running on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal(err)
	}
}
