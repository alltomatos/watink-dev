package controllers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// @Summary      Importar contatos do WhatsApp
// @Description  Dispara a importação da agenda de contatos da sessão WhatsApp conectada
// @Tags         contacts
// @Produce      json
// @Success      202  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Security     BearerAuth
// @Router       /contacts/import [post]
func (cc *ContactController) ImportContacts(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Contacts")
	if !ok {
		return
	}

	sessions, err := cc.sessions.FindAll(c.Request.Context(), tenantID)
	if err != nil {
		utils.RespondWithInternalError(c, err, "ImportContacts")
		return
	}

	var session *domain.ChannelSession
	for i := range sessions {
		if sessions[i].Status == "CONNECTED" {
			session = &sessions[i]
			break
		}
	}
	if session == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "No connected WhatsApp session available to import contacts"})
		return
	}

	command := map[string]interface{}{
		"id":        uuid.New().String(),
		"timestamp": time.Now().UnixMilli(),
		"tenantId":  tenantID.String(),
		"type":      "contact.import",
		"payload": map[string]interface{}{
			"sessionId": session.ID,
		},
	}
	routingKey := fmt.Sprintf("wbot.%s.%d.contact.import", tenantID.String(), session.ID)
	if err := cc.publisher.PublishCommand(routingKey, command); err != nil {
		utils.RespondWithInternalError(c, err, "ImportContacts")
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"message": "Contact import started"})
}

// @Summary      Sincronizar foto do contato via WhatsApp
// @Description  Solicita ao engine que busque a foto de perfil atualizada do contato no WhatsApp
// @Tags         contacts
// @Produce      json
// @Param        contactId  path      int  true  "ID do contato"
// @Success      202        {object}  map[string]string
// @Failure      404        {object}  map[string]string
// @Failure      409        {object}  map[string]string
// @Security     BearerAuth
// @Router       /contacts/{contactId}/sync [post]
func (cc *ContactController) SyncContact(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Contacts")
	if !ok {
		return
	}
	id, ok := utils.ParseIntParam(c, "contactId")
	if !ok {
		return
	}

	contact, err := cc.contactRepo.FindByID(c.Request.Context(), id, tenantID)
	if err != nil {
		utils.RespondWithInternalError(c, err, "SyncContact")
		return
	}
	if contact == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	}

	sessions, err := cc.sessions.FindAll(c.Request.Context(), tenantID)
	if err != nil {
		utils.RespondWithInternalError(c, err, "SyncContact")
		return
	}
	var session *domain.ChannelSession
	for i := range sessions {
		if sessions[i].Status == "CONNECTED" {
			session = &sessions[i]
			break
		}
	}
	if session == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "No connected WhatsApp session available"})
		return
	}

	command := map[string]interface{}{
		"id":        uuid.New().String(),
		"timestamp": time.Now().UnixMilli(),
		"tenantId":  tenantID.String(),
		"type":      "contact.sync",
		"payload": map[string]interface{}{
			"sessionId": fmt.Sprintf("%d", session.ID),
			"number":    contact.Number,
		},
	}
	routingKey := fmt.Sprintf("wbot.%s.%d.contact.sync", tenantID.String(), session.ID)
	if err := cc.publisher.PublishCommand(routingKey, command); err != nil {
		utils.RespondWithInternalError(c, err, "SyncContact")
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"message": "Contact sync requested"})
}
