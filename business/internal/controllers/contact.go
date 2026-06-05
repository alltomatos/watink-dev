package controllers

import (
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

type ContactController struct {
	contactRepo domain.ContactRepository
}

func NewContactController(cr domain.ContactRepository) *ContactController {
	return &ContactController{contactRepo: cr}
}

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

	contact := &domain.Contact{
		Name:          input.Name,
		Number:        input.Number,
		ProfilePicUrl: input.ProfilePicUrl,
		Email:         input.Email,
		IsGroup:       input.IsGroup,
		WalletUserID:  input.WalletUserID,
		TenantID:      tenantID,
	}

	if err := cc.contactRepo.Create(c.Request.Context(), contact); err != nil {
		utils.RespondWithInternalError(c, err, "CreateContact")
		return
	}

	c.JSON(http.StatusOK, contact)
}

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
		fields["name"] = input.Name
	}
	if input.Number != "" {
		fields["number"] = input.Number
	}
	if input.ProfilePicUrl != "" {
		fields["profilePicUrl"] = input.ProfilePicUrl
	}
	if input.Email != "" {
		fields["email"] = input.Email
	}
	if input.WalletUserID != nil {
		fields["walletUserId"] = input.WalletUserID
	}

	if err := cc.contactRepo.Update(c.Request.Context(), contact, fields); err != nil {
		utils.RespondWithInternalError(c, err, "UpdateContact")
		return
	}

	c.JSON(http.StatusOK, contact)
}

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

	c.JSON(http.StatusOK, gin.H{"message": "Contact deleted successfully"})
}
