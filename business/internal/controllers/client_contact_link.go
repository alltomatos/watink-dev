package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// linkContactInput is the write DTO for LinkContact. ConfirmReassign is the
// explicit opt-in required to move a Contact away from a Client it is
// already linked to (ADR 0023 / docs/agents/clients.md: reassignment is
// permitted but never silently applied).
type linkContactInput struct {
	ConfirmReassign bool `json:"confirmReassign"`
}

// LinkContact links a Contact to a Client (Contact.ClientID). A Contact
// belongs to at most one Client. Linking a Contact that already belongs to a
// DIFFERENT Client requires confirmReassign=true in the body — otherwise the
// handler responds 409 with enough context for the frontend to render a
// confirmation dialog (ADR 0023).
// @Summary      Vincular contato ao cliente
// @Tags         clients
// @Accept       json
// @Produce      json
// @Param        id         path  int  true  "ID do cliente"
// @Param        contactId  path  int  true  "ID do contato"
// @Success      200  {object}  models.Contact
// @Failure      409  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /clients/{id}/contacts/{contactId} [post]
func (cc *ClientController) LinkContact(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	clientID, ok := utils.ParseIntParam(c, "id")
	if !ok {
		return
	}
	contactID, ok := utils.ParseIntParam(c, "contactId")
	if !ok {
		return
	}

	var in linkContactInput
	if err := c.ShouldBindJSON(&in); err != nil {
		// Body is optional — an empty/absent body means confirmReassign=false.
		in = linkContactInput{}
	}

	var client models.Client
	if err := db.Where(`id = ? AND "tenantId" = ?`, clientID, tenantID).First(&client).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "cliente não encontrado"})
		return
	}

	var contact models.Contact
	if err := db.Session(&gorm.Session{NewDB: true}).Where(`id = ? AND "tenantId" = ?`, contactID, tenantID).First(&contact).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contato não encontrado"})
		return
	}

	if contact.ClientID != nil && *contact.ClientID != clientID && !in.ConfirmReassign {
		var currentClient models.Client
		currentClientName := ""
		if err := db.Session(&gorm.Session{NewDB: true}).Where(`id = ? AND "tenantId" = ?`, *contact.ClientID, tenantID).First(&currentClient).Error; err == nil {
			currentClientName = currentClient.Name
		}
		c.JSON(http.StatusConflict, gin.H{
			"error":                "contato já vinculado a outro cliente",
			"requiresConfirmation": true,
			"currentClientId":      *contact.ClientID,
			"currentClientName":    currentClientName,
		})
		return
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Contact{}).
		Where(`id = ? AND "tenantId" = ?`, contactID, tenantID).
		Update("clientId", client.ID).Error; err != nil {
		utils.RespondWithInternalError(c, err, "LinkContact")
		return
	}

	var updated models.Contact
	if err := db.Session(&gorm.Session{NewDB: true}).Where(`id = ? AND "tenantId" = ?`, contactID, tenantID).First(&updated).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ReloadContactAfterLink")
		return
	}
	c.JSON(http.StatusOK, updated)
}

// UnlinkContact removes the link between a Contact and a Client, only when
// the Contact currently points to THIS Client (:id) — otherwise 400.
// @Summary      Desvincular contato do cliente
// @Tags         clients
// @Produce      json
// @Param        id         path  int  true  "ID do cliente"
// @Param        contactId  path  int  true  "ID do contato"
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /clients/{id}/contacts/{contactId} [delete]
func (cc *ClientController) UnlinkContact(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	clientID, ok := utils.ParseIntParam(c, "id")
	if !ok {
		return
	}
	contactID, ok := utils.ParseIntParam(c, "contactId")
	if !ok {
		return
	}

	var contact models.Contact
	if err := db.Where(`id = ? AND "tenantId" = ?`, contactID, tenantID).First(&contact).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contato não encontrado"})
		return
	}

	if contact.ClientID == nil || *contact.ClientID != clientID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "contato não pertence a este cliente"})
		return
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Contact{}).
		Where(`id = ? AND "tenantId" = ?`, contactID, tenantID).
		Update("clientId", nil).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UnlinkContact")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contato desvinculado"})
}
