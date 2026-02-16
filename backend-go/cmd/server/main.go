package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/alltomatos/watinkdev/backend-go/internal/controllers"
	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/routes"
	"github.com/alltomatos/watinkdev/backend-go/internal/services"
	"github.com/alltomatos/watinkdev/backend-go/internal/web"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"io/fs"
)

func main() {
	// Load .env if exists
	_ = godotenv.Load()

	log.Println("🦞 Watink Industrial starting...")

	// 1. Wait for Database (Retry logic for clean VPS setup)
	retryCount := 0
	for {
		err := tryConnectDB()
		if err == nil {
			break
		}
		retryCount++
		if retryCount > 30 {
			log.Fatalf("Fatal: Could not connect to database after 30 attempts: %v", err)
		}
		log.Printf("Waiting for database... (attempt %d/30)", retryCount)
		time.Sleep(5 * time.Second)
	}

	// 2. Connect to Redis
	services.ConnectRedis()
	services.SetupRedisBroadcast()

	// 3. Connect to RabbitMQ (Wait for it too)
	rabbitMQ := services.NewRabbitMQService()
	retryCount = 0
	for {
		err := rabbitMQ.Connect()
		if err == nil {
			break
		}
		retryCount++
		if retryCount > 30 {
			log.Printf("Warning: Failed to connect to RabbitMQ: %v. Continuing without messaging...", err)
			break
		}
		log.Printf("Waiting for RabbitMQ... (attempt %d/30)", retryCount)
		time.Sleep(5 * time.Second)
	}

	// Start services
	server := services.StartSocket()
	services.StartEventListener(rabbitMQ)

	r := gin.Default()

	// Socket.IO
	r.GET("/socket.io/*any", gin.WrapH(server))
	r.POST("/socket.io/*any", gin.WrapH(server))

	// API
	apiGroup := r.Group("/api")
	{
		apiGroup.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "OK", "service": "watink-industrial"})
		})
		apiGroup.GET("/version", controllers.GetVersion)
		routes.SetupRoutes(apiGroup)
	}

	// Serve Frontend (Embed)
	publicFS, err := fs.Sub(web.StaticFiles, "build")
	if err != nil {
		log.Printf("Warning: Frontend build not found in embed: %v", err)
	}

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if len(path) >= 4 && path[:4] == "/api" {
			c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
			return
		}
		f, err := publicFS.Open(path[1:])
		if err == nil {
			f.Close()
			http.FileServer(http.FS(publicFS)).ServeHTTP(c.Writer, c.Request)
			return
		}
		index, err := web.StaticFiles.ReadFile("build/index.html")
		if err != nil {
			c.String(http.StatusNotFound, "Initial setup needed: Run build and release.")
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", index)
	})

	port := os.Getenv("PORT_GO")
	if port == "" {
		port = "8082"
	}

	log.Printf("✅ Watink Industrial Ready on port %s", port)
	s := &http.Server{Addr: ":" + port, Handler: r}
	if err := s.ListenAndServe(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func tryConnectDB() error {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from DB connection panic")
		}
	}()
	database.Connect()
	database.Migrate()
	return nil
}
