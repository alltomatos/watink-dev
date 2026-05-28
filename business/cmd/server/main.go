package main

import (
	"context"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/database"
	"github.com/alltomatos/watinkdev/business/internal/controllers"
	"github.com/alltomatos/watinkdev/business/internal/middleware"
	"github.com/alltomatos/watinkdev/business/internal/plugins"
	"github.com/alltomatos/watinkdev/business/internal/routes"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/internal/web"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	otelgin "go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
)

func main() {
	_ = godotenv.Load()

	// 0. Init OpenTelemetry
	shutdown, err := services.InitTelemetry(context.Background())
	if err != nil {
		log.Printf("Warning: OTel init failed: %v", err)
	} else {
		defer shutdown(context.Background())
	}

	log.Println("Watink Business starting...")

	// 1. Connect to Database
	database.Connect()
	database.Migrate()

	// 2. Connect to Redis
	services.ConnectRedis()
	services.SetupRedisBroadcast()

	// 3. Connect to RabbitMQ
	rabbitMQ := services.NewRabbitMQService()
	services.SetRabbitMQService(rabbitMQ)
	if err := rabbitMQ.Connect(); err == nil {
		// 4. Start Workers
		rabbitMQ.StartFlowWorker()
		services.StartEventListener(rabbitMQ)
	} else {
		log.Printf("⚠️ Warning: RabbitMQ connection failed: %v", err)
	}

	// Start services
	server := services.StartSocket()

	r := gin.Default()

	// 5. Global Middleware
	r.Use(otelgin.Middleware("watink-business"))
	r.Use(middleware.CORSMiddleware())

	// Socket.IO Routes
	r.GET("/socket.io/*any", gin.WrapH(server))
	r.POST("/socket.io/*any", gin.WrapH(server))

	// API Group
	apiGroup := r.Group("/api/v1")
	{
		apiGroup.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "OK", "service": "watink-business"})
		})

		// Init integrated marketplace hub manager (replaces standalone plugin-manager service)
		plugins.InitHubManager()

		// Initialize Plugin SDK Manager
		pluginManager := plugins.NewPluginManager(database.DB, apiGroup)

		// Register Plugins
		pluginManager.Register(&plugins.HelpdeskPlugin{})
		pluginManager.Register(&plugins.WebchatPlugin{})
		pluginManager.Register(&plugins.ClientesPlugin{})
		pluginManager.Register(&plugins.SaaSPlugin{})

		routes.SetupRoutes(apiGroup)
	}

	// Compat routes (frontend without /v1 prefix)
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK", "service": "watink-business"})
	})
	r.GET("/api/initial-setup/check", controllers.CheckSetup)
	r.POST("/api/initial-setup", controllers.InitialSetup)

	// Serve Frontend (Embed)
	publicFS, _ := fs.Sub(web.StaticFiles, "build")

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		lowerPath := strings.ToLower(path)
		if strings.HasPrefix(lowerPath, "/api") {
			c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
			return
		}

		f, err := publicFS.Open(strings.TrimPrefix(path, "/"))
		if err == nil {
			f.Close()
			if strings.HasPrefix(path, "/assets/") {
				c.Header("Cache-Control", "public, max-age=31536000, immutable")
			}
			http.FileServer(http.FS(publicFS)).ServeHTTP(c.Writer, c.Request)
			return
		}

		// SPA Fallback
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
		index, err := fs.ReadFile(publicFS, "index.html")
		if err != nil {
			c.String(http.StatusInternalServerError, "Index not found")
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", index)
	})

	port := os.Getenv("PORT_GO")
	if port == "" {
		port = "8082"
	}

	log.Printf("✅ Watink Business Ready on port %s", port)
	s := &http.Server{Addr: ":" + port, Handler: r}
	_ = s.ListenAndServe()
}