package routes

import (
	"github.com/alltomatos/watinkdev/backend-go/internal/controllers"
	"github.com/alltomatos/watinkdev/backend-go/internal/middleware"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Public Routes
	r.POST("/auth/login", controllers.Login)
	r.GET("/public-settings", controllers.GetPublicSettings)
	r.GET("/initial-setup/check", controllers.CheckSetup)
	r.POST("/initial-setup", controllers.InitialSetup)

	// Protected Routes
	protected := r.Group("/")
	protected.Use(middleware.IsAuth())
	protected.Use(middleware.TenantMiddleware())
	{
		// Settings
		protected.GET("/settings", controllers.ListSettings)
		protected.PUT("/settings/:key", controllers.UpdateSetting)

		// Tickets
		protected.GET("/tickets", controllers.ListTickets)
		protected.GET("/tickets/:ticketId", controllers.ShowTicket)
		protected.GET("/messages/:ticketId", controllers.ListMessages)

		// WhatsApp Connections
		protected.GET("/whatsapp", controllers.ListWhatsapps)
		protected.GET("/whatsapp/:id", controllers.ShowWhatsapp)

		// Contacts
		protected.GET("/contacts", controllers.ListContacts)
		protected.GET("/contacts/:contactId", controllers.ShowContact)
		protected.POST("/contacts", controllers.CreateContact)

		// Queues
		protected.GET("/queue", controllers.ListQueues)
		protected.GET("/queue/:queueId", controllers.ShowQueue)

		// Quick Answers
		protected.GET("/quickAnswers", controllers.ListQuickAnswers)
		protected.GET("/quickAnswers/:quickAnswerId", controllers.ShowQuickAnswer)
	}
}
