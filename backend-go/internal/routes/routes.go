package routes

import (
	"github.com/alltomatos/watinkdev/backend-go/internal/controllers"
	"github.com/alltomatos/watinkdev/backend-go/internal/middleware"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(group *gin.RouterGroup) {
	// Public Routes
	group.POST("/auth/login", controllers.Login)
	group.POST("/auth/refresh_token", controllers.RefreshToken)
	group.GET("/public-settings", controllers.GetPublicSettings)
	group.GET("/initial-setup/check", controllers.CheckSetup)
	group.POST("/initial-setup", controllers.InitialSetup)
	group.GET("/system/stats", controllers.GetSystemStats)
	group.GET("/system/maintenance", controllers.GetMaintenanceStatus)

	// Swagger / API docs
	group.GET("/docs", controllers.SwaggerUI)
	group.GET("/swagger.json", controllers.SwaggerJSON)

	// Business Marketplace Support (V1)
	group.GET("/v1/plugins/catalog", controllers.PluginsCatalog)
	group.GET("/v1/plugins/installed", controllers.PluginsInstalled)
	group.POST("/v1/plugins/checkout", controllers.PluginsCheckout)
	group.GET("/v1/plugins/instance", controllers.PluginsInstance)

	// Protected Routes
	protected := group.Group("/")
	protected.Use(controllers.MaintenanceMiddleware())
	protected.Use(middleware.IsAuth())
	protected.Use(middleware.TenantMiddleware())
	{
		// Update & System
		protected.POST("/system/update", controllers.StartUpdate)
		// Auth
		protected.DELETE("/auth/logout", controllers.Logout)

		// Settings
		protected.GET("/settings", controllers.ListSettings)
		protected.PUT("/settings/:key", controllers.UpdateSetting)

		// Tickets
		protected.GET("/tickets", controllers.ListTickets)
		protected.GET("/tickets/", controllers.ListTickets)
		protected.GET("/tickets/:ticketId", controllers.ShowTicket)

		// Messages
		protected.GET("/messages/:ticketId", controllers.ListMessages)
		protected.POST("/messages/:ticketId", controllers.SendMessage)

		// WhatsApp Connections
		protected.GET("/whatsapp", controllers.ListWhatsapps)
		protected.GET("/whatsapp/", controllers.ListWhatsapps)
		protected.GET("/whatsapp/:id", controllers.ShowWhatsapp)

		// WhatsApp Sessions
		protected.POST("/whatsappsession/all", controllers.RestartAllSessions)
		protected.POST("/whatsappsession/:whatsappId", controllers.StartSession)
		protected.PUT("/whatsappsession/:whatsappId", controllers.StartSession)
		protected.DELETE("/whatsappsession/:whatsappId", controllers.StopSession)

		// Contacts
		protected.GET("/contacts", controllers.ListContacts)
		protected.GET("/contacts/", controllers.ListContacts)
		protected.GET("/contacts/:contactId", controllers.ShowContact)
		protected.POST("/contacts", controllers.CreateContact)

		// Queues
		protected.GET("/queue", controllers.ListQueues)
		protected.GET("/queue/", controllers.ListQueues)
		protected.GET("/queue/:queueId", controllers.ShowQueue)

		// Quick Answers
		protected.GET("/quickAnswers", controllers.ListQuickAnswers)
		protected.GET("/quickAnswers/", controllers.ListQuickAnswers)
		protected.GET("/quickAnswers/:quickAnswerId", controllers.ShowQuickAnswer)

		// Knowledge Bases
		protected.GET("/knowledge-bases", controllers.ListKnowledgeBases)
		protected.GET("/knowledge-bases/", controllers.ListKnowledgeBases)
		protected.GET("/knowledge-bases/:knowledgeBaseId", controllers.ShowKnowledgeBase)
		protected.POST("/knowledge-bases", controllers.CreateKnowledgeBase)
		protected.PUT("/knowledge-bases/:knowledgeBaseId", controllers.UpdateKnowledgeBase)
		protected.DELETE("/knowledge-bases/:knowledgeBaseId", controllers.DeleteKnowledgeBase)

		// Users
		protected.GET("/users", controllers.ListUsers)
		protected.GET("/users/", controllers.ListUsers)
		protected.GET("/users/:userId", controllers.ShowUser)
		protected.POST("/users", controllers.CreateUser)
		protected.PUT("/users/:userId", controllers.UpdateUser)
		protected.DELETE("/users/:userId", controllers.DeleteUser)

		// SaaS
		protected.GET("/saas/tenants", controllers.ListTenants)
		protected.GET("/saas/tenants/:tenantId/plan", controllers.GetTenantPlan)
		protected.GET("/saas/plans", controllers.ListPlans)
		protected.POST("/saas/plans", controllers.CreatePlan)

		// RBAC
		protected.GET("/groups", controllers.ListGroups)
		protected.POST("/groups", controllers.CreateGroup)
		protected.GET("/permissions", controllers.ListPermissions)

		// Flows
		protected.GET("/flows", controllers.ListFlows)
		protected.POST("/flows", controllers.CreateFlow)

		// Pipelines
		protected.GET("/pipelines", controllers.ListPipelines)
		protected.GET("/pipelines/", controllers.ListPipelines)
		protected.POST("/pipelines", controllers.CreatePipeline)
	}
}
