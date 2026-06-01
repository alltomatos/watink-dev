package controllers

import (
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/gin-gonic/gin"
)

type SessionController struct {
	sessionRepo domain.ChannelSessionRepository
}

func NewSessionController(sr domain.ChannelSessionRepository) *SessionController {
	return &SessionController{sessionRepo: sr}
}

func (sc *SessionController) StartSession(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	whatsappID, _ := strconv.Atoi(c.Param("whatsappId"))

	session, err := sc.sessionRepo.FindByID(c.Request.Context(), whatsappID, tenantID)
	if err != nil || session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found or access denied"})
		return
	}

	var req struct {
		UsePairingCode bool   `json:"usePairingCode"`
		PhoneNumber    string `json:"phoneNumber"`
	}
	_ = c.ShouldBindJSON(&req)

	if err := services.StartWhatsAppSession(channelSessionToModel(session), req.UsePairingCode, req.PhoneNumber, true); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Starting session."})
}

func (sc *SessionController) StopSession(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	whatsappID, _ := strconv.Atoi(c.Param("whatsappId"))

	session, err := sc.sessionRepo.FindByID(c.Request.Context(), whatsappID, tenantID)
	if err != nil || session == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found or access denied"})
		return
	}

	if err := sc.sessionRepo.Update(c.Request.Context(), session, map[string]interface{}{"status": "DISCONNECTED"}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update session status"})
		return
	}

	if err := services.StopWhatsAppSession(channelSessionToModel(session)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stop session"})
		return
	}

	services.EmitToNamespace("/", "whatsappSession", map[string]interface{}{
		"action":  "update",
		"session": session,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Session disconnected."})
}

func (sc *SessionController) RestartAllSessions(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	whatsapps, err := sc.sessionRepo.FindAll(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch WhatsApp connections"})
		return
	}

	for i := range whatsapps {
		_ = services.StartWhatsAppSession(channelSessionToModel(&whatsapps[i]), false, "", true)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Restarting all sessions."})
}

func channelSessionToModel(s *domain.ChannelSession) models.Whatsapp {
	return models.Whatsapp{
		ID:              s.ID,
		Session:         s.Session,
		Qrcode:          s.Qrcode,
		Status:          s.Status,
		Battery:         s.Battery,
		Plugged:         s.Plugged,
		Name:            s.Name,
		IsDefault:       s.IsDefault,
		Retries:         s.Retries,
		GreetingMessage: s.GreetingMessage,
		FarewellMessage: s.FarewellMessage,
		TenantID:        s.TenantID,
		SyncHistory:     s.SyncHistory,
		SyncPeriod:      s.SyncPeriod,
		Number:          s.Number,
		ProfilePicUrl:   s.ProfilePicUrl,
		KeepAlive:       s.KeepAlive,
		CreatedAt:       s.CreatedAt,
		UpdatedAt:       s.UpdatedAt,
		FirstConnection: s.FirstConnection,
		EngineType:      s.EngineType,
	}
}
