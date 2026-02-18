package plugins

import (
	"net/http"
	"time"

	"github.com/alltomatos/watinkdev/backend-go/pkg/sdk"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type HelpdeskPlugin struct{}

type Protocol struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	Subject   string    `json:"subject"`
	Status    string    `json:"status"`
	TenantID  uuid.UUID `gorm:"column:tenantId" json:"tenantId"`
	CreatedAt time.Time `json:"createdAt"`
}

func (hp *HelpdeskPlugin) GetManifest() sdk.PluginManifest {
	return sdk.PluginManifest{
		Slug:        "helpdesk",
		Name:        "Helpdesk Pro",
		Version:     "2.0.0",
		Description: "Gestão profissional de tickets e protocolos",
		Type:        "pro",
	}
}

func (hp *HelpdeskPlugin) OnInstall(core sdk.WatinkCore) error {
	return core.GetDB().AutoMigrate(&Protocol{})
}

func (hp *HelpdeskPlugin) OnActivate(core sdk.WatinkCore) error {
	core.RegisterRoute("GET", "/helpdesk/protocols", func(c *gin.Context) {
		tenantID, _ := c.Get("tenantId")
		var protocols []Protocol
		core.GetDB().Where("tenantId = ?", tenantID).Find(&protocols)
		c.JSON(http.StatusOK, protocols)
	})
	return nil
}

func (hp *HelpdeskPlugin) OnDeactivate(core sdk.WatinkCore) error {
	return nil
}
