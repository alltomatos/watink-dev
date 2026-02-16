package main

import (
	"log"
	"net/http"
	"os"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/routes"
	"github.com/alltomatos/watinkdev/backend-go/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if exists
	_ = godotenv.Load()

	// Connect to Database
	database.Connect()
	database.Migrate()

	// Connect to RabbitMQ
	rabbitMQ := services.NewRabbitMQService()
	if err := rabbitMQ.Connect(); err != nil {
		log.Printf("Warning: Failed to connect to RabbitMQ: %v", err)
	}

	// Start Socket.IO
	server := services.StartSocket()

	// Start Event Listener
	services.StartEventListener(rabbitMQ)

	// Initialize Gin
	r := gin.Default()

	// Socket.IO Routes
	r.GET("/socket.io/*any", gin.WrapH(server))
	r.POST("/socket.io/*any", gin.WrapH(server))

	// Basic Health Check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "OK",
			"service": "backend-go",
		})
	})

	// Setup Routes
	routes.SetupRoutes(r)

	port := os.Getenv("PORT_GO")
	if port == "" {
		port = "8082" // Port specifically for Go backend
	}

	log.Printf("Backend Go starting on port %s", port)
	
	// Create a custom server to handle both Gin and Socket.IO
	s := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	if err := s.ListenAndServe(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
