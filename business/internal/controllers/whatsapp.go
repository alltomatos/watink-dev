package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
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

// @Summary      Detalhar conexão WhatsApp
// @Tags         whatsapp
// @Produce      json
// @Param        id  path      int  true  "ID da conexão"
// @Success      200 {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /whatsapp/{id} [get]
func (wc *WhatsappController) ShowWhatsapp(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, ok2 := utils.ParseIntParam(c, "id")
	if !ok2 {
		return
	}

	// Usa busca enriquecida com relations
	whatsappModel, err := wc.sessionRepo.FindByIDDetail(c.Request.Context(), id, tenantID)
	if err != nil || whatsappModel == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found or access denied"})
		return
	}

	// Monta resposta enriquecida
	response := map[string]interface{}{
		"id":              whatsappModel.ID,
		"session":         whatsappModel.Session,
		"qrcode":          whatsappModel.Qrcode,
		"status":          whatsappModel.Status,
		"battery":         whatsappModel.Battery,
		"plugged":         whatsappModel.Plugged,
		"name":            whatsappModel.Name,
		"isDefault":       whatsappModel.IsDefault,
		"retries":         whatsappModel.Retries,
		"greetingMessage": whatsappModel.GreetingMessage,
		"farewellMessage": whatsappModel.FarewellMessage,
		"tenantId":        whatsappModel.TenantID,
		"syncHistory":     whatsappModel.SyncHistory,
		"syncPeriod":      whatsappModel.SyncPeriod,
		"number":          whatsappModel.Number,
		"profilePicUrl":   whatsappModel.ProfilePicUrl,
		"keepAlive":       whatsappModel.KeepAlive,
		"createdAt":       whatsappModel.CreatedAt,
		"updatedAt":       whatsappModel.UpdatedAt,
		"firstConnection": whatsappModel.FirstConnection,
		"engineType":      whatsappModel.EngineType,
	}

	// Adiciona relations apenas se existirem
	if len(whatsappModel.Queues) > 0 {
		response["queues"] = whatsappModel.Queues
	}

	c.JSON(http.StatusOK, response)
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
	id, ok2 := utils.ParseIntParam(c, "id")
	if !ok2 {
		return
	}

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

// @Summary      Remover conexão WhatsApp
// @Tags         whatsapp
// @Produce      json
// @Param        id  path      int  true  "ID da conexão"
// @Success      200 {object}  map[string]string
// @Security     BearerAuth
// @Router       /whatsapp/{id} [delete]
func (wc *WhatsappController) DeleteWhatsapp(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, ok2 := utils.ParseIntParam(c, "id")
	if !ok2 {
		return
	}

	whatsapp, err := wc.sessionRepo.FindByID(c.Request.Context(), id, tenantID)
	if err != nil || whatsapp == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found or access denied"})
		return
	}

	model := models.Whatsapp{
		ID:              whatsapp.ID,
		Session:         whatsapp.Session,
		Qrcode:          whatsapp.Qrcode,
		Status:          whatsapp.Status,
		Battery:         whatsapp.Battery,
		Plugged:         whatsapp.Plugged,
		Name:            whatsapp.Name,
		IsDefault:       whatsapp.IsDefault,
		Retries:         whatsapp.Retries,
		GreetingMessage: whatsapp.GreetingMessage,
		FarewellMessage: whatsapp.FarewellMessage,
		TenantID:        whatsapp.TenantID,
		SyncHistory:     whatsapp.SyncHistory,
		SyncPeriod:      whatsapp.SyncPeriod,
		Number:          whatsapp.Number,
		ProfilePicUrl:   whatsapp.ProfilePicUrl,
		KeepAlive:       whatsapp.KeepAlive,
		CreatedAt:       whatsapp.CreatedAt,
		UpdatedAt:       whatsapp.UpdatedAt,
		FirstConnection: whatsapp.FirstConnection,
		EngineType:      whatsapp.EngineType,
	}
	if err := wc.sessionService.DeleteWhatsAppSession(model); err != nil {
		utils.RespondWithInternalError(c, err, "DeleteWhatsAppSession")
		return
	}

	if err := wc.sessionRepo.DeleteWithRelations(c.Request.Context(), id, tenantID); err != nil {
		utils.RespondWithInternalError(c, err, "DeleteWithRelations")
		return
	}

	wc.broadcast.EmitToTenantRoom(tenantID.String(), "whatsapp", gin.H{
		"action":      "delete",
		"whatsappId": whatsapp.ID,
	})

	c.JSON(http.StatusOK, gin.H{"message": "WhatsApp connection deleted"})
}
