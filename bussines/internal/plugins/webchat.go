package plugins

import (
	"net/http"
	"time"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/alltomatos/watinkdev/bussines/pkg/sdk"
	"github.com/gin-gonic/gin"
)

type WebchatPlugin struct{}

func (wp *WebchatPlugin) GetManifest() sdk.PluginManifest {
	return sdk.PluginManifest{
		Slug:        "webchat",
		Name:        "Webchat Widget",
		Version:     "1.0.0",
		Description: "Chat em tempo real para seu site",
		Type:        "pro",
	}
}

func (wp *WebchatPlugin) OnInstall(core sdk.WatinkCore) error {
	// Webchat usually shares the same models, but we might need specific configs
	return nil
}

func (wp *WebchatPlugin) OnActivate(core sdk.WatinkCore) error {
	// GET /api/webchat/:whatsappId
	core.RegisterRoute("GET", "/webchat/:whatsappId", func(c *gin.Context) {
		whatsappId := c.Param("whatsappId")
		var whatsapp models.Whatsapp
		if err := database.DB.First(&whatsapp, whatsappId).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Webchat not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"name":            whatsapp.Name,
			"greetingMessage": whatsapp.GreetingMessage,
			"farewellMessage": whatsapp.FarewellMessage,
		})
	})

	// POST /api/webchat/:whatsappId/tickets
	core.RegisterRoute("POST", "/webchat/:whatsappId/tickets", func(c *gin.Context) {
		whatsappId := c.Param("whatsappId")
		var body struct {
			Name    string `json:"name"`
			Email   string `json:"email"`
			Phone   string `json:"phone"`
			Message string `json:"message"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var whatsapp models.Whatsapp
		if err := database.DB.First(&whatsapp, whatsappId).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Webchat not found"})
			return
		}

		// Find or Create Contact
		var contact models.Contact
		res := database.DB.Where("email = ? AND tenantId = ?", body.Email, whatsapp.TenantID).First(&contact)
		if res.Error != nil {
			number := body.Phone
			if number == "" {
				number = "webchat-" + time.Now().Format("150405")
			}
			contact = models.Contact{
				Name:     body.Name,
				Number:   number,
				Email:    body.Email,
				TenantID: whatsapp.TenantID,
			}
			database.DB.Create(&contact)
		}

		// Simplified Ticket creation logic for the plugin
		var ticket models.Ticket
		database.DB.Where("contactId = ? AND whatsappId = ? AND status != ?", contact.ID, whatsapp.ID, "closed").First(&ticket)
		if ticket.ID == 0 {
			ticket = models.Ticket{
				ContactID:  contact.ID,
				WhatsappID: whatsapp.ID,
				Status:     "pending",
				TenantID:   whatsapp.TenantID,
			}
			database.DB.Create(&ticket)
		}

		// Emitting message to RabbitMQ would go here (omitted for brevity in this initial port)
		// but core should have an EmitEvent method in the future

		c.JSON(http.StatusOK, gin.H{
			"ticketId":  ticket.ID,
			"contactId": contact.ID,
		})
	})

	return nil
}

func (wp *WebchatPlugin) OnDeactivate(core sdk.WatinkCore) error {
	return nil
}
