package controllers

import (
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/gin-gonic/gin"
)

type WhatsappController struct {
	sessionRepo domain.ChannelSessionRepository
}

func NewWhatsappController(sr domain.ChannelSessionRepository) *WhatsappController {
	return &WhatsappController{sessionRepo: sr}
}

func (wc *WhatsappController) ListWhatsapps(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	whatsapps, err := wc.sessionRepo.FindAll(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch WhatsApp connections"})
		return
	}

	c.JSON(http.StatusOK, whatsapps)
}

func (wc *WhatsappController) ShowWhatsapp(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))

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

func (wc *WhatsappController) CreateWhatsapp(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	limitService := services.NewPlanLimitService()
	if err := limitService.CheckLimit(tenantID, "connections"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	var input domain.ChannelSession
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.TenantID = tenantID
	if input.Status == "" {
		input.Status = "DISCONNECTED"
	}

	if input.IsDefault {
		if err := wc.sessionRepo.ResetDefaultFlag(c.Request.Context(), tenantID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset default connection"})
			return
		}
	}

	if err := wc.sessionRepo.Create(c.Request.Context(), &input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, input)
}

func (wc *WhatsappController) UpdateWhatsapp(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.IsDefault {
		if err := wc.sessionRepo.ResetDefaultFlag(c.Request.Context(), tenantID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset default connection"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, err := wc.sessionRepo.FindByID(c.Request.Context(), id, tenantID)
	if err != nil || updated == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found or access denied"})
		return
	}

	c.JSON(http.StatusOK, updated)
}

func (wc *WhatsappController) DeleteWhatsapp(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))

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
	if err := services.DeleteWhatsAppSession(model); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to disconnect WhatsApp session before deletion"})
		return
	}

	if err := wc.sessionRepo.DeleteWithRelations(c.Request.Context(), id, tenantID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to delete connection: " + err.Error()})
		return
	}

	services.EmitToNamespace("/", "whatsapp", gin.H{
		"action":     "delete",
		"whatsappId": whatsapp.ID,
	})

	c.JSON(http.StatusOK, gin.H{"message": "WhatsApp connection deleted"})
}
