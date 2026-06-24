package controllers

import (
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

type WhatsappController struct {
	sessionRepo    domain.ChannelSessionRepository
	planLimitSvc   domain.PlanLimitServiceInterface
	broadcast      *services.RedisBroadcast
	sessionService *services.WhatsAppSessionService
}

func NewWhatsappController(sr domain.ChannelSessionRepository, planLimitSvc domain.PlanLimitServiceInterface, broadcast *services.RedisBroadcast, sessionService *services.WhatsAppSessionService) *WhatsappController {
	return &WhatsappController{
		sessionRepo:    sr,
		planLimitSvc:   planLimitSvc,
		broadcast:      broadcast,
		sessionService: sessionService,
	}
}

// @Summary      Listar conexões WhatsApp
// @Tags         whatsapp
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /whatsapp [get]
func (wc *WhatsappController) ListWhatsapps(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}

	whatsapps, err := wc.sessionRepo.FindAll(c.Request.Context(), tenantID)
	if err != nil {
		utils.RespondWithInternalError(c, err, "ListWhatsapps")
		return
	}

	c.JSON(http.StatusOK, whatsapps)
}

// @Summary      Criar conexão WhatsApp
// @Tags         whatsapp
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados da conexão"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /whatsapp [post]
func (wc *WhatsappController) CreateWhatsapp(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}

	if err := wc.planLimitSvc.CheckLimit(tenantID, "connections"); err != nil {
		utils.RespondWithServiceError(c, http.StatusForbidden, err, "Connection limit reached for this plan")
		return
	}

	var input domain.ChannelSession
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if _, err := utils.ValidateStringField(input.Name, "name", 255); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(input.Number, "number", 50); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(input.ProfilePicUrl, "profilePicUrl", 2048); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(input.GreetingMessage, "greetingMessage", 2000); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(input.FarewellMessage, "farewellMessage", 2000); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.TenantID = tenantID
	if input.Status == "" {
		input.Status = "DISCONNECTED"
	}

	if input.IsDefault {
		if err := wc.sessionRepo.ResetDefaultFlag(c.Request.Context(), tenantID); err != nil {
			utils.RespondWithInternalError(c, err, "ResetDefaultFlag")
			return
		}
	}

	if err := wc.sessionRepo.Create(c.Request.Context(), &input); err != nil {
		utils.RespondWithInternalError(c, err, "CreateWhatsapp")
		return
	}

	c.JSON(http.StatusOK, input)
}

// @Summary      Atualizar conexão WhatsApp
// @Tags         whatsapp
// @Accept       json
// @Produce      json
// @Param        id    path      int                     true  "ID da conexão"
// @Param        body  body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /whatsapp/{id} [put]
func (wc *WhatsappController) UpdateWhatsapp(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))

	whatsapp, err := wc.sessionRepo.FindByID(c.Request.Context(), id, tenantID)
	if err != nil || whatsapp == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found or access denied"})
		return
	}

	var input domain.ChannelSession
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if _, err := utils.ValidateStringField(input.Name, "name", 255); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(input.Number, "number", 50); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(input.ProfilePicUrl, "profilePicUrl", 2048); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(input.GreetingMessage, "greetingMessage", 2000); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(input.FarewellMessage, "farewellMessage", 2000); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.IsDefault {
		if err := wc.sessionRepo.ResetDefaultFlag(c.Request.Context(), tenantID); err != nil {
			utils.RespondWithInternalError(c, err, "ResetDefaultFlag")
			return
		}
	}

	fields := map[string]interface{}{
		"session":         input.Session,
		"qrcode":          input.Qrcode,
		"status":          input.Status,
		"battery":         input.Battery,
		"plugged":         input.Plugged,
		"name":            input.Name,
		"isDefault":       input.IsDefault,
		"retries":         input.Retries,
		"greetingMessage": input.GreetingMessage,
		"farewellMessage": input.FarewellMessage,
		"syncHistory":     input.SyncHistory,
		"syncPeriod":      input.SyncPeriod,
		"number":          input.Number,
		"profilePicUrl":   input.ProfilePicUrl,
		"keepAlive":       input.KeepAlive,
		"engineType":      input.EngineType,
	}

	if err := wc.sessionRepo.Update(c.Request.Context(), whatsapp, fields); err != nil {
		utils.RespondWithInternalError(c, err, "UpdateWhatsapp")
		return
	}

	updated, err := wc.sessionRepo.FindByID(c.Request.Context(), id, tenantID)
	if err != nil || updated == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found or access denied"})
		return
	}

	c.JSON(http.StatusOK, updated)
}
