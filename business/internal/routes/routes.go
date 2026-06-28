package routes

import (
	"github.com/alltomatos/watinkdev/business/internal/application"
	"github.com/alltomatos/watinkdev/business/internal/controllers"
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/flow"
	"github.com/alltomatos/watinkdev/business/internal/middleware"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/gin-gonic/gin"
)

type RouteRabbitMQ interface {
	domain.CommandPublisher
	domain.QueueMonitor
	domain.KnowledgeJobPublisher
}

func SetupRoutes(group *gin.RouterGroup, rabbitMQ RouteRabbitMQ, container *application.Container) {
	db := container.DB
	messageController := controllers.NewMessageController(rabbitMQ, container.Broadcast)
	systemController := controllers.NewSystemController(container.SystemRepo, rabbitMQ)
	setupController := controllers.NewSetupController(services.NewSetupService(container.DB))
	userController := controllers.NewUserController(container.UserRepo, container.PlanLimitSvc)
	queueController := controllers.NewQueueController()
	contactController := controllers.NewContactController(container.ContactRepo, container.ChannelSessionRepo, rabbitMQ, container.Broadcast)
	sessionController := controllers.NewSessionController(container.ChannelSessionRepo, container.Broadcast, container.SessionService)
	ticketController := controllers.NewTicketController(container.UpdateTicket, container.Broadcast, container.MessageRepo, rabbitMQ)
	whatsappController := controllers.NewWhatsappController(container.ChannelSessionRepo, container.PlanLimitSvc, container.Broadcast, container.SessionService)
	pluginController := controllers.NewPluginController(container.PlanLimitSvc)
	authController := controllers.NewAuthController(container.UserRepo)
	settingController := controllers.NewSettingController(container.SettingRepo, container.Broadcast)
	tagController := controllers.NewTagController()
	pipelineController := controllers.NewPipelineController()
	dealController := controllers.NewDealController()
	kbController := controllers.NewKnowledgeBaseController(rabbitMQ)
	groupController := controllers.NewGroupController(container.PermissionRepo)
	roleController := controllers.NewRoleController(container.PermissionRepo)
	// FlowBuilder FASE 1: build a channel registry + runtime skeleton for the
	// on-demand run endpoint (POST /flows/:id/run). Uses the worker DB
	// (container.DB) with manual WHERE "tenantId"; RLS is inert in StartFlow.
	flowChannels := flow.NewChannelRegistry()
	flowChannels.Register(flow.NewWhatsAppAdapter(rabbitMQ, container.RedisSvc))
	flowRuntime := flow.NewSkeleton(container.DB, flowChannels, container.RedisSvc)
	flowController := controllers.NewFlowController(flowRuntime)
	quickAnswerController := controllers.NewQuickAnswerController(rabbitMQ, container.Broadcast, db)
	versionController := controllers.NewVersionController(container.VersionRepo)
	swaggerController := controllers.NewSwaggerController(container.SwaggerPermRepo)

	// Public Routes
	group.POST("/auth/login", authController.Login)
	group.POST("/auth/refresh_token", authController.RefreshToken)
	group.GET("/public-settings", settingController.GetPublicSettings)
	group.GET("/initial-setup/check", setupController.CheckSetup)
	group.POST("/initial-setup", setupController.InitialSetup)
	group.GET("/system/maintenance", controllers.GetMaintenanceStatus)

	// Swagger / API docs
	group.GET("/docs", swaggerController.SwaggerUI)
	group.GET("/swagger.json", swaggerController.SwaggerJSON)

	// Protected Routes (IsAuth + TenantMiddleware required)
	protected := group.Group("/")
	protected.Use(controllers.MaintenanceMiddleware())
	protected.Use(middleware.IsAuth(db))
	protected.Use(middleware.TenantMiddleware())
	{
		// System (superadmin only — exposes cross-tenant stats and infrastructure)
		system := protected.Group("/system")
		system.Use(middleware.SuperAdminOnly())
		{
			system.GET("/stats", systemController.GetSystemStats)
			system.GET("/rabbitmq/queues", systemController.GetRabbitMQQueues)
			system.GET("/latest-release", controllers.GetLatestRelease)
			system.GET("/version", versionController.GetVersion)
			system.GET("/version/postgres", versionController.GetPostgresVersion)
			system.GET("/version/rabbitmq", versionController.GetRabbitMQVersion)
			system.GET("/version/redis", versionController.GetRedisVersion)
			system.POST("/update", controllers.StartUpdate)
		}

		// Plugins (tenant-scoped — moved inside protected group)
		protected.GET("/plugins/catalog", pluginController.Catalog)
		protected.GET("/plugins/installed", pluginController.Installed)
		protected.POST("/plugins/checkout", pluginController.Checkout)
		protected.GET("/plugins/instance", pluginController.Instance)

		// Auth
		protected.DELETE("/auth/logout", authController.Logout)

		// Settings
		protected.GET("/settings", settingController.ListSettings)
		protected.PUT("/settings/:key", settingController.UpdateSetting)

		// Tickets
		protected.GET("/tickets", ticketController.ListTickets)
		protected.GET("/tickets/", ticketController.ListTickets)
		protected.GET("/tickets/:ticketId", ticketController.ShowTicket)
		protected.PUT("/tickets/:ticketId", ticketController.UpdateTicket)
		protected.GET("/tickets/:ticketId/logs", ticketController.ListTicketLogs)
		protected.POST("/tickets/:ticketId/history/recover", ticketController.RecoverHistory)

		// Dashboard
		protected.GET("/dashboard", controllers.GetDashboardData)

		// Messages
		protected.GET("/messages/:ticketId", messageController.ListMessages)
		protected.POST("/messages/:ticketId", messageController.SendMessage)
		// On-demand media download (separate path to avoid Gin wildcard conflict
		// with :ticketId at the same position)
		protected.POST("/media/:messageId/download", messageController.DownloadMedia)

		// WhatsApp Connections
		protected.GET("/whatsapp", whatsappController.ListWhatsapps)
		protected.GET("/whatsapp/", whatsappController.ListWhatsapps)
		protected.GET("/whatsapp/:id", whatsappController.ShowWhatsapp)
		protected.POST("/whatsapp", whatsappController.CreateWhatsapp)
		protected.PUT("/whatsapp/:id", whatsappController.UpdateWhatsapp)
		protected.GET("/whatsapp/:id/stats", whatsappController.StatsWhatsapp)
		protected.PUT("/whatsapp/:id/keepalive", whatsappController.ToggleKeepAlive)
		protected.DELETE("/whatsapp/:id", whatsappController.DeleteWhatsapp)

		// WhatsApp Sessions
		protected.POST("/whatsappsession/all", sessionController.RestartAllSessions)
		protected.POST("/whatsappsession/:whatsappId", sessionController.StartSession)
		protected.PUT("/whatsappsession/:whatsappId", sessionController.StartSession)
		protected.DELETE("/whatsappsession/:whatsappId", sessionController.StopSession)

		// Contacts
		protected.GET("/contacts", contactController.ListContacts)
		protected.GET("/contacts/", contactController.ListContacts)
		protected.GET("/contacts/:contactId", contactController.ShowContact)
		protected.POST("/contacts", contactController.CreateContact)
		protected.POST("/contacts/", contactController.CreateContact)
		protected.POST("/contacts/import", contactController.ImportContacts)
		protected.POST("/contacts/:contactId/sync", contactController.SyncContact)
		protected.PUT("/contacts/:contactId", contactController.UpdateContact)
		protected.DELETE("/contacts/:contactId", contactController.DeleteContact)

		// Queues
		protected.GET("/queue", queueController.ListQueues)
		protected.GET("/queue/", queueController.ListQueues)
		protected.GET("/queue/:queueId", queueController.ShowQueue)
		protected.POST("/queue", queueController.CreateQueue)
		protected.POST("/queue/", queueController.CreateQueue)
		protected.PUT("/queue/:queueId", queueController.UpdateQueue)
		protected.DELETE("/queue/:queueId", queueController.DeleteQueue)

		// Quick Answers
		protected.GET("/quickAnswers", quickAnswerController.List)
		protected.GET("/quickAnswers/", quickAnswerController.List)
		protected.GET("/quickAnswers/:quickAnswerId", quickAnswerController.Show)
		protected.POST("/quickAnswers", quickAnswerController.Create)
		protected.POST("/quickAnswers/", quickAnswerController.Create)
		protected.PUT("/quickAnswers/:quickAnswerId", quickAnswerController.Update)
		protected.DELETE("/quickAnswers/:quickAnswerId", quickAnswerController.Delete)
		protected.POST("/quickAnswers/:quickAnswerId/send", quickAnswerController.Send)

		// Knowledge Bases
		protected.GET("/knowledge-bases", kbController.List)
		protected.GET("/knowledge-bases/", kbController.List)
		protected.GET("/knowledge-bases/:knowledgeBaseId", kbController.Show)
		protected.POST("/knowledge-bases", kbController.Create)
		protected.PUT("/knowledge-bases/:knowledgeBaseId", kbController.Update)
		protected.DELETE("/knowledge-bases/:knowledgeBaseId", kbController.Delete)
		protected.POST("/knowledge-bases/:knowledgeBaseId/sources", kbController.CreateSource)
		protected.DELETE("/knowledge-bases/:knowledgeBaseId/sources/:sourceId", kbController.DeleteSource)

		// Users
		protected.GET("/users", userController.ListUsers)
		protected.GET("/users/", userController.ListUsers)
		protected.GET("/users/:userId", userController.ShowUser)
		protected.POST("/users", userController.CreateUser)
		protected.PUT("/users/:userId", userController.UpdateUser)
		protected.DELETE("/users/:userId", userController.DeleteUser)

		// SaaS (superadmin only)
		saas := protected.Group("/saas")
		saas.Use(middleware.SuperAdminOnly())
		{
			saas.GET("/tenants", controllers.ListTenants)
			saas.GET("/tenants/:tenantId/plan", controllers.GetTenantPlan)
			saas.GET("/plans", controllers.ListPlans)
			saas.POST("/plans", controllers.CreatePlan)
		}

		// RBAC
		protected.GET("/groups", groupController.List)
		protected.POST("/groups", groupController.Create)
		protected.GET("/groups/:groupId", groupController.Show)
		protected.PUT("/groups/:groupId", groupController.Update)
		protected.DELETE("/groups/:groupId", groupController.Delete)
		protected.GET("/permissions", groupController.ListPermissions)

		// Roles
		protected.GET("/roles", roleController.List)
		protected.POST("/roles", roleController.Create)
		protected.GET("/roles/:roleId", roleController.Show)
		protected.PUT("/roles/:roleId", roleController.Update)
		protected.DELETE("/roles/:roleId", roleController.Delete)

		// Flows
		protected.GET("/flows", flowController.List)
		protected.POST("/flows", flowController.Create)
		protected.POST("/flows/ai", flowController.AISuggest)
		protected.GET("/flows/:flowId", flowController.Show)
		protected.PUT("/flows/:flowId", flowController.Update)
		protected.DELETE("/flows/:flowId", flowController.Delete)
		protected.POST("/flows/:flowId/simulate", flowController.Simulate)
		protected.POST("/flows/:flowId/run", flowController.Run)

		// Tags
		protected.GET("/tags", tagController.List)
		protected.POST("/tags", tagController.Create)
		protected.PUT("/tags/:id", tagController.Update)
		protected.DELETE("/tags/:id", tagController.Delete)
		protected.GET("/tag-groups", tagController.ListGroups)
		protected.PUT("/entities/:entityType/:id/tags/sync", tagController.SyncEntityTags)

		// Deals
		protected.GET("/deals", dealController.List)
		protected.POST("/deals", dealController.Create)
		protected.PUT("/deals/:id", dealController.Update)

		// Pipelines
		protected.GET("/pipelines", pipelineController.List)
		protected.GET("/pipelines/", pipelineController.List)
		protected.POST("/pipelines", pipelineController.Create)
		protected.PUT("/pipelines/:pipelineId", pipelineController.Update)
		protected.POST("/pipelines/import", pipelineController.Import)
		protected.GET("/pipelines/export/:pipelineId", pipelineController.Export)
		protected.POST("/pipelines/ai-suggest", pipelineController.AISuggest)
	}
}
