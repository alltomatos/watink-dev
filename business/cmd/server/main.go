// @title           Watink Business API
// @version         2.0.0
// @description     API do backend Go — atendimento e automação WhatsApp.
// @termsOfService  https://watink.com.br/terms

// @contact.name   Watink Dev
// @contact.email  dev@watink.com.br

// @license.name  Proprietary
// @license.url   https://watink.com.br

// @host      localhost:8082
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Bearer JWT token. Formato: "Bearer <token>"

package main

import (
	"context"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/alltomatos/watinkdev/business/docs"
	"github.com/alltomatos/watinkdev/business/internal/application"
	"github.com/alltomatos/watinkdev/business/internal/controllers"
	"github.com/alltomatos/watinkdev/business/internal/database"
	"github.com/alltomatos/watinkdev/business/internal/domain"
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

	shutdown, err := services.InitTelemetry(context.Background())
	if err != nil {
		log.Printf("Warning: OTel init failed: %v", err)
	} else {
		defer shutdown(context.Background())
	}

	log.Println("Watink Business starting...")
	database.Connect()
	database.Migrate()

	// Instanciação explícita — Injeção via construtor (DI Pura)
	redisSvc, err := services.NewRedisServiceFromEnv()
	if err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(otelgin.Middleware("watink-business"))
	r.Use(middleware.ObservabilityMiddleware())
	r.Use(middleware.CORSMiddleware())

	// Build the single SSEHub first so both the SSEController (registration) and
	// the SSEBroadcast (delivery) share the exact same instance.
	hub := services.NewSSEHub()
	hub.StartHeartbeat(10 * time.Second)
	sseBroadcast := services.NewSSEBroadcast(hub)
	redisBroadcast := services.NewRedisBroadcast(redisSvc, sseBroadcast)
	redisBroadcast.Start()
	var broadcast domain.Broadcaster = redisBroadcast
	log.Println("Real-time backend: SSE")

	rabbitMQ := services.NewRabbitMQProvider(os.Getenv("AMQP_URL"))
	// Pass hub so the container uses the same SSEHub — avoids a second instance.
	container := application.NewContainer(database.DB, redisSvc, broadcast, rabbitMQ, hub)

	if err := rabbitMQ.Connect(); err == nil {
		rabbitMQ.StartFlowWorker()
		eventListener := services.NewEventListener(container.ChannelSessionRepo, container.MessageRepo, container.ContactRepo, container.TicketRepo, container.ReceiveMessage, broadcast, database.DB)
		services.StartEventListener(rabbitMQ, eventListener)
	} else {
		log.Printf("⚠️ Warning: RabbitMQ connection failed: %v", err)
	}

	r.Static("/public/media", "public/media")

	// SSE stream — registrado SEM gin.Logger para evitar que o token JWT
	// presente na query string (?token=...) apareça no access-log.
	sseController := controllers.NewSSEController(container.SSEHub, redisSvc)
	r.GET("/api/v1/events", sseController.Stream)

	apiGroup := r.Group("/api/v1")
	apiGroup.Use(gin.Logger())
	{
		apiGroup.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "OK", "service": "watink-business"})
		})

		pluginManager := plugins.NewPluginManager(database.DB, apiGroup)
		pluginManager.Register(&plugins.HelpdeskPlugin{})
		pluginManager.Register(&plugins.WebchatPlugin{})
		pluginManager.Register(&plugins.ClientesPlugin{})
		pluginManager.Register(&plugins.SaaSPlugin{})

		routes.SetupRoutes(apiGroup, rabbitMQ, container)
	}

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK", "service": "watink-business"})
	})
	setupCtrl := controllers.NewSetupController(services.NewSetupService(database.DB))
	r.GET("/api/initial-setup/check", setupCtrl.CheckSetup)
	r.POST("/api/initial-setup", setupCtrl.InitialSetup)

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
