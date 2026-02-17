package main

import (
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/plugins"
	"github.com/alltomatos/watinkdev/backend-go/internal/routes"
	"github.com/alltomatos/watinkdev/backend-go/internal/services"
	"github.com/alltomatos/watinkdev/backend-go/internal/web"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	log.Println("🦞 Watink Business starting...")

	// 1. Connect to Database
	database.Connect()
	database.Migrate()

	// 2. Connect to Redis
	services.ConnectRedis()
	services.SetupRedisBroadcast()

	// 3. Connect to RabbitMQ
	rabbitMQ := services.NewRabbitMQService()
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

	// Socket.IO Routes
	r.GET("/socket.io/*any", gin.WrapH(server))
	r.POST("/socket.io/*any", gin.WrapH(server))

	// API Group
	apiGroup := r.Group("/api")
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

	// Legacy Plugin Manager proxy support (/plugins/api/v1/... -> /api/v1/...)
	r.Group("/plugins").Any("/*any", func(c *gin.Context) {
		path := c.Param("any")
		if strings.HasPrefix(path, "/api/v1") {
			c.Request.URL.Path = path
		} else {
			c.Request.URL.Path = "/api/v1" + path
		}
		r.HandleContext(c)
	})

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
