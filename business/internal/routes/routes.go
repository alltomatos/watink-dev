package routes

import (
	"github.com/alltomatos/watinkdev/business/internal/application"
	"github.com/alltomatos/watinkdev/business/internal/controllers"
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/middleware"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(group *gin.RouterGroup, rabbitMQ domain.RabbitMQServiceInterface, container *application.Container) {
	messageController := controllers.NewMessageController(rabbitMQ)
	userController := controllers.NewUserController(container.UserRepo)
	contactController := controllers.NewContactController(container.ContactRepo)
	sessionController := controllers.NewSessionController(container.ChannelSessionRepo)
	ticketController := controllers.NewTicketController(container.UpdateTicket)
	whatsappController := controllers.NewWhatsappController(container.ChannelSessionRepo)
	authController := controllers.NewAuthController(container.UserRepo)
	// Public Routes
	group.POST("/auth/login", authController.Login)
	group.POST("/auth/refresh_token", authController.RefreshToken)
	group.GET("/public-settings", controllers.GetPublicSettings)
	group.GET("/initial-setup/check", controllers.CheckSetup)
	group.POST("/initial-setup", controllers.InitialSetup)
	group.GET("/system/maintenance", controllers.GetMaintenanceStatus)

	// Swagger / API docs
	group.GET("/docs", controllers.SwaggerUI)
	group.GET("/swagger.json", controllers.SwaggerJSON)

	// Business Marketplace Support
	group.GET("/plugins/catalog", controllers.PluginsCatalog)
	group.GET("/plugins/installed", controllers.PluginsInstalled)
	group.POST("/plugins/checkout", controllers.PluginsCheckout)
	group.GET("/plugins/instance", controllers.PluginsInstance)

	// Protected Routes
	protected := group.Group("/")
	protected.Use(controllers.MaintenanceMiddleware())
	protected.Use(middleware.IsAuth())
	protected.Use(middleware.TenantMiddleware())
	{
		// Update & System
		protected.GET("/system/stats", controllers.GetSystemStats)
		protected.GET("/system/rabbitmq/queues", controllers.GetRabbitMQQueues)
		protected.GET("/system/latest-release", controllers.GetLatestRelease)
		protected.POST("/system/update", controllers.StartUpdate)
		// Auth
		protected.DELETE("/auth/logout", authController.Logout)

		// Settings
		protected.GET("/settings", controllers.ListSettings)
		protected.PUT("/settings/:key", controllers.UpdateSetting)

		// Tickets
		protected.GET("/tickets", ticketController.ListTickets)
		protected.GET("/tickets/", ticketController.ListTickets)
		protected.GET("/tickets/:ticketId", ticketController.ShowTicket)
		protected.PUT("/tickets/:ticketId", ticketController.UpdateTicket)
		protected.GET("/tickets/:ticketId/logs", ticketController.ListTicketLogs)

		// Dashboard
		protected.GET("/dashboard", controllers.GetDashboardData)

		// Messages
		protected.GET("/messages/:ticketId", messageController.ListMessages)
		protected.POST("/messages/:ticketId", messageController.SendMessage)

		// WhatsApp Connections
		protected.GET("/whatsapp", whatsappController.ListWhatsapps)
		protected.GET("/whatsapp/", whatsappController.ListWhatsapps)
		protected.GET("/whatsapp/:id", whatsappController.ShowWhatsapp)
		protected.POST("/whatsapp", whatsappController.CreateWhatsapp)
		protected.PUT("/whatsapp/:id", whatsappController.UpdateWhatsapp)
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
		protected.PUT("/contacts/:contactId", contactController.UpdateContact)
		protected.DELETE("/contacts/:contactId", contactController.DeleteContact)

		// Queues
		protected.GET("/queue", controllers.ListQueues)
		protected.GET("/queue/", controllers.ListQueues)
		protected.GET("/queue/:queueId", controllers.ShowQueue)
		protected.POST("/queue", controllers.CreateQueue)
		protected.POST("/queue/", controllers.CreateQueue)
		protected.PUT("/queue/:queueId", controllers.UpdateQueue)
		protected.DELETE("/queue/:queueId", controllers.DeleteQueue)

		// Quick Answers
		protected.GET("/quickAnswers", controllers.ListQuickAnswers)
		protected.GET("/quickAnswers/", controllers.ListQuickAnswers)
		protected.GET("/quickAnswers/:quickAnswerId", controllers.ShowQuickAnswer)
		protected.POST("/quickAnswers", controllers.CreateQuickAnswer)
		protected.POST("/quickAnswers/", controllers.CreateQuickAnswer)
		protected.PUT("/quickAnswers/:quickAnswerId", controllers.UpdateQuickAnswer)
		protected.DELETE("/quickAnswers/:quickAnswerId", controllers.DeleteQuickAnswer)

		// Knowledge Bases
		protected.GET("/knowledge-bases", controllers.ListKnowledgeBases)
		protected.GET("/knowledge-bases/", controllers.ListKnowledgeBases)
		protected.GET("/knowledge-bases/:knowledgeBaseId", controllers.ShowKnowledgeBase)
		protected.POST("/knowledge-bases", controllers.CreateKnowledgeBase)
		protected.PUT("/knowledge-bases/:knowledgeBaseId", controllers.UpdateKnowledgeBase)
		protected.DELETE("/knowledge-bases/:knowledgeBaseId", controllers.DeleteKnowledgeBase)
		protected.POST("/knowledge-bases/:knowledgeBaseId/sources", controllers.CreateKnowledgeBaseSource)
		protected.DELETE("/knowledge-bases/:knowledgeBaseId/sources/:sourceId", controllers.DeleteKnowledgeBaseSource)

		// Users
		protected.GET("/users", userController.ListUsers)
		protected.GET("/users/", userController.ListUsers)
		protected.GET("/users/:userId", userController.ShowUser)
		protected.POST("/users", userController.CreateUser)
		protected.PUT("/users/:userId", userController.UpdateUser)
		protected.DELETE("/users/:userId", userController.DeleteUser)

		// SaaS
		protected.GET("/saas/tenants", controllers.ListTenants)
		protected.GET("/saas/tenants/:tenantId/plan", controllers.GetTenantPlan)
		protected.GET("/saas/plans", controllers.ListPlans)
		protected.POST("/saas/plans", controllers.CreatePlan)

		// RBAC
		protected.GET("/groups", controllers.ListGroups)
		protected.POST("/groups", controllers.CreateGroup)
		protected.GET("/groups/:groupId", controllers.ShowGroup)
		protected.PUT("/groups/:groupId", controllers.UpdateGroup)
		protected.DELETE("/groups/:groupId", controllers.DeleteGroup)
		protected.GET("/permissions", controllers.ListPermissions)

		// Roles
		protected.GET("/roles", controllers.ListRoles)
		protected.POST("/roles", controllers.CreateRole)
		protected.GET("/roles/:roleId", controllers.ShowRole)
		protected.PUT("/roles/:roleId", controllers.UpdateRole)
		protected.DELETE("/roles/:roleId", controllers.DeleteRole)

		// Flows
		protected.GET("/flows", controllers.ListFlows)
		protected.POST("/flows", controllers.CreateFlow)
		protected.GET("/flows/:flowId", controllers.ShowFlow)
		protected.PUT("/flows/:flowId", controllers.UpdateFlow)
		protected.DELETE("/flows/:flowId", controllers.DeleteFlow)

		// Tags
		protected.GET("/tags", controllers.ListTags)
		protected.POST("/tags", controllers.CreateTag)
		protected.PUT("/tags/:id", controllers.UpdateTag)
		protected.DELETE("/tags/:id", controllers.DeleteTag)
		protected.GET("/tag-groups", controllers.ListTagGroups)
		protected.PUT("/entities/:entityType/:id/tags/sync", controllers.SyncEntityTags)

		// Pipelines
		protected.GET("/pipelines", controllers.ListPipelines)
		protected.GET("/pipelines/", controllers.ListPipelines)
		protected.POST("/pipelines", controllers.CreatePipeline)
		protected.PUT("/pipelines/:pipelineId", controllers.UpdatePipeline)
		protected.POST("/pipelines/import", controllers.ImportPipeline)
		protected.GET("/pipelines/export/:pipelineId", controllers.ExportPipeline)
		protected.POST("/pipelines/ai-suggest", controllers.AISuggestPipeline)
	}
}
