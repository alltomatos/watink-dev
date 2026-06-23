package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ContactController struct {
	contactRepo domain.ContactRepository
	sessions    domain.ChannelSessionRepository
	publisher   domain.CommandPublisher
	broadcast   *services.RedisBroadcast
}

func NewContactController(cr domain.ContactRepository, sessions domain.ChannelSessionRepository, publisher domain.CommandPublisher, broadcast *services.RedisBroadcast) *ContactController {
	return &ContactController{contactRepo: cr, sessions: sessions, publisher: publisher, broadcast: broadcast}
}

// @Summary      Listar contatos
// @Tags         contacts
// @Produce      json
// @Param        searchParam  query     string  false  "Busca por nome ou número"
// @Success      200          {array}   map[string]interface{}
// @Failure      401          {object}  map[string]string
// @Security     BearerAuth
// @Router       /contacts [get]
func (cc *ContactController) ListContacts(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Contacts")
	if !ok {
		return
	}

	searchParam := c.Query("searchParam")
	contacts, err := cc.contactRepo.Find(c.Request.Context(), tenantID, searchParam)
	if err != nil {
		utils.RespondWithInternalError(c, err, "ListContacts")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"contacts": contacts,
	})
}

// @Summary      Detalhar contato
// @Tags         contacts
// @Produce      json
// @Param        contactId  path      int  true  "ID do contato"
// @Success      200        {object}  map[string]interface{}
// @Failure      404        {object}  map[string]string
// @Security     BearerAuth
// @Router       /contacts/{contactId} [get]
func (cc *ContactController) ShowContact(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Contacts")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("contactId"))

	contact, err := cc.contactRepo.FindByID(c.Request.Context(), id, tenantID)
	if err != nil {
		utils.RespondWithInternalError(c, err, "ShowContact")
		return
	}
	if contact == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	}

	c.JSON(http.StatusOK, contact)
}

// @Summary      Criar contato
// @Tags         contacts
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados do contato"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /contacts [post]
func (cc *ContactController) CreateContact(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Contacts")
	if !ok {
		return
	}

	var input struct {
		Name          string `json:"name"`
		Number        string `json:"number"`
		ProfilePicUrl string `json:"profilePicUrl"`
		Email         string `json:"email"`
		IsGroup       bool   `json:"isGroup"`
		WalletUserID  *int   `json:"walletUserId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	name, err := utils.ValidateStringField(input.Name, "name", 255)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	number, err := utils.ValidateStringField(input.Number, "number", 50)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	profilePicUrl, err := utils.ValidateStringField(input.ProfilePicUrl, "profilePicUrl", 2048)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	email, err := utils.ValidateStringField(input.Email, "email", 255)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	contact := &domain.Contact{
		Name:          name,
		Number:        number,
		ProfilePicUrl: profilePicUrl,
		Email:         email,
		IsGroup:       input.IsGroup,
		WalletUserID:  input.WalletUserID,
		TenantID:      tenantID,
	}

	if err := cc.contactRepo.Create(c.Request.Context(), contact); err != nil {
		utils.RespondWithInternalError(c, err, "CreateContact")
		return
	}

	cc.broadcast.EmitToTenantRoom(tenantID.String(), "contact", gin.H{"action": "create", "contact": contact})

	c.JSON(http.StatusOK, contact)
}

// @Summary      Atualizar contato
// @Tags         contacts
// @Accept       json
// @Produce      json
// @Param        contactId  path      int                     true  "ID do contato"
// @Param        body       body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200        {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /contacts/{contactId} [put]
func (cc *ContactController) UpdateContact(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Contacts")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("contactId"))

	var input struct {
		Name          string `json:"name"`
		Number        string `json:"number"`
		ProfilePicUrl string `json:"profilePicUrl"`
		Email         string `json:"email"`
		WalletUserID  *int   `json:"walletUserId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	contact, err := cc.contactRepo.FindByID(c.Request.Context(), id, tenantID)
	if err != nil || contact == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	}

	fields := map[string]interface{}{}
	if input.Name != "" {
		name, err := utils.ValidateStringField(input.Name, "name", 255)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		fields["name"] = name
	}
	if input.Number != "" {
		number, err := utils.ValidateStringField(input.Number, "number", 50)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		fields["number"] = number
	}
	if input.ProfilePicUrl != "" {
		profilePicUrl, err := utils.ValidateStringField(input.ProfilePicUrl, "profilePicUrl", 2048)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		fields["profilePicUrl"] = profilePicUrl
	}
	if input.Email != "" {
		email, err := utils.ValidateStringField(input.Email, "email", 255)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		fields["email"] = email
	}
	if input.WalletUserID != nil {
		fields["walletUserId"] = input.WalletUserID
	}

	if err := cc.contactRepo.Update(c.Request.Context(), contact, fields); err != nil {
		utils.RespondWithInternalError(c, err, "UpdateContact")
		return
	}

	if updated, err := cc.contactRepo.FindByID(c.Request.Context(), id, tenantID); err == nil && updated != nil {
		contact = updated
	}
	cc.broadcast.EmitToTenantRoom(tenantID.String(), "contact", gin.H{"action": "update", "contact": contact})

	c.JSON(http.StatusOK, contact)
}

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

// @Summary      Remover contato
// @Tags         contacts
// @Produce      json
// @Param        contactId  path      int  true  "ID do contato"
// @Success      200        {object}  map[string]string
// @Security     BearerAuth
// @Router       /contacts/{contactId} [delete]
func (cc *ContactController) DeleteContact(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Contacts")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("contactId"))

	if err := cc.contactRepo.Delete(c.Request.Context(), id, tenantID); err != nil {
		utils.RespondWithInternalError(c, err, "DeleteContact")
		return
	}

	cc.broadcast.EmitToTenantRoom(tenantID.String(), "contact", gin.H{"action": "delete", "contactId": strconv.Itoa(id)})

	c.JSON(http.StatusOK, gin.H{"message": "Contact deleted successfully"})
}
