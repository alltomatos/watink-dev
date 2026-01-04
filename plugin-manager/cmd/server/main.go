package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/alltomatos/watink/plugin-manager/internal/config"
	"github.com/alltomatos/watink/plugin-manager/internal/database"
	"github.com/alltomatos/watink/plugin-manager/internal/handlers"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Connect to database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.Default()

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "plugin-manager"})
	})

	// Version endpoint
	router.GET("/version", func(c *gin.Context) {
		version := "0.0.0"
		data, err := os.ReadFile("VERSION")
		if err == nil {
			version = strings.TrimSpace(string(data))
		}
		lastUpdated := os.Getenv("BUILD_TIMESTAMP")
		if lastUpdated == "" {
			lastUpdated = time.Now().UTC().Format(time.RFC3339)
		}
		c.Header("Cache-Control", "no-store")
		c.JSON(http.StatusOK, gin.H{
			"service":     "plugin-manager",
			"version":     version,
			"lastUpdated": lastUpdated,
		})
	})

	// Plugin routes
	pluginHandler := handlers.NewPluginHandler(db, cfg)
	api := router.Group("/api/v1")
	{
		plugins := api.Group("/plugins")
		{
			plugins.GET("/catalog", pluginHandler.GetCatalog)
			plugins.GET("/installed", pluginHandler.GetInstalled)
			plugins.GET("/:id/icon", pluginHandler.GetIcon)
			plugins.POST("/:id/install", pluginHandler.Install)
			plugins.POST("/:id/activate", pluginHandler.Activate)
			plugins.POST("/:id/deactivate", pluginHandler.Deactivate)
			plugins.DELETE("/:id", pluginHandler.Uninstall)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "3005"
	}
	log.Printf("Plugin Manager starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
