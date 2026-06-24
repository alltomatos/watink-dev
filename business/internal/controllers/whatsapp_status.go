package controllers

import (
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

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
	if err := wc.sessionService.DeleteWhatsAppSession(model); err != nil {
		utils.RespondWithInternalError(c, err, "DeleteWhatsAppSession")
		return
	}

	if err := wc.sessionRepo.DeleteWithRelations(c.Request.Context(), id, tenantID); err != nil {
		utils.RespondWithInternalError(c, err, "DeleteWithRelations")
		return
	}

	wc.broadcast.EmitToNamespace("/", "whatsapp", gin.H{
		"action":     "delete",
		"whatsappId": whatsapp.ID,
	})

	c.JSON(http.StatusOK, gin.H{"message": "WhatsApp connection deleted"})
}
