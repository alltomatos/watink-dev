package main

import (
	"log"
	"net/http"
	"os"

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

	// Plugin routes
	pluginHandler := handlers.NewPluginHandler(db)
	api := router.Group("/api/v1")
	{
		plugins := api.Group("/plugins")
		{
			plugins.GET("/catalog", pluginHandler.GetCatalog)
			plugins.GET("/installed", pluginHandler.GetInstalled)
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
