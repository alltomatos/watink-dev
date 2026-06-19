package controllers

import (
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// engineLatencyMs measures the round-trip time to the engine health endpoint.
// Returns -1 when the engine URL is not configured or unreachable, so the
// frontend can render "—" instead of a fake number.
func engineLatencyMs() int {
	url := os.Getenv("ENGINE_HEALTH_URL")
	if url == "" {
		return -1
	}
	client := &http.Client{Timeout: 2 * time.Second}
	start := time.Now()
	resp, err := client.Get(url)
	if err != nil {
		return -1
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return -1
	}
	return int(time.Since(start).Milliseconds())
}

// @Summary      Estatísticas da conexão
// @Tags         whatsapp
// @Produce      json
// @Param        id   path      int  true  "ID da conexão"
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /whatsapp/{id}/stats [get]
func (wc *WhatsappController) StatsWhatsapp(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	db := auth.GetDB(c)
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Independent sessions per aggregate so GORM statement state never leaks
	// between the two queries. Tenant scoping is applied explicitly.
	var ticketsCount int64
	if err := db.Session(&gorm.Session{}).Model(&models.Ticket{}).
		Where("\"tenantId\" = ? AND \"whatsappId\" = ?", tenantID, id).
		Count(&ticketsCount).Error; err != nil {
		utils.RespondWithInternalError(c, err, "StatsWhatsapp.tickets")
		return
	}

	startOfDay := time.Now().Truncate(24 * time.Hour)
	var messagesToday int64
	if err := db.Session(&gorm.Session{}).Model(&models.Message{}).
		Joins("JOIN \"Tickets\" t ON t.id = \"Messages\".\"ticketId\"").
		Where("t.\"whatsappId\" = ? AND \"Messages\".\"tenantId\" = ? AND \"Messages\".\"createdAt\" >= ?", id, tenantID, startOfDay).
		Count(&messagesToday).Error; err != nil {
		utils.RespondWithInternalError(c, err, "StatsWhatsapp.messagesToday")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messagesToday": messagesToday,
		"tickets":       ticketsCount,
		"latencyMs":     engineLatencyMs(),
	})
}

// @Summary      Alternar reconexão automática (keepAlive)
// @Tags         whatsapp
// @Accept       json
// @Produce      json
// @Param        id    path      int                  true  "ID da conexão"
// @Param        body  body      map[string]bool      true  "keepAlive"
// @Success      200   {object}  map[string]bool
// @Security     BearerAuth
// @Router       /whatsapp/{id}/keepalive [put]
func (wc *WhatsappController) ToggleKeepAlive(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var input struct {
		KeepAlive bool `json:"keepAlive"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	whatsapp, err := wc.sessionRepo.FindByID(c.Request.Context(), id, tenantID)
	if err != nil || whatsapp == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "WhatsApp connection not found or access denied"})
		return
	}

	if err := wc.sessionRepo.Update(c.Request.Context(), whatsapp, map[string]interface{}{"keepAlive": input.KeepAlive}); err != nil {
		utils.RespondWithInternalError(c, err, "ToggleKeepAlive")
		return
	}

	c.JSON(http.StatusOK, gin.H{"keepAlive": input.KeepAlive})
}
