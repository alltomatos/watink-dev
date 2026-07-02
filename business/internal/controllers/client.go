package controllers

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/cryptobox"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ClientController is the core CRUD for Client (ADR 0023) — the CRM entity
// promoted from the old licensed "Gestão de Clientes" plugin. Scope here is
// strictly the Client record itself: no Contact<->Client linking endpoints
// (separate task), no ClientAddress endpoints (separate task), no transitive
// history (separate task).
type ClientController struct{}

func NewClientController() *ClientController { return &ClientController{} }

// clientInput is the write DTO — deliberately NOT models.Client, so a caller
// can never smuggle DocumentEnc/TenantID/DeletedAt straight through Bind.
type clientInput struct {
	Type       string  `json:"type"`
	Name       string  `json:"name"`
	SocialName *string `json:"socialName"`
	Document   string  `json:"document"`
	Email      string  `json:"email"`
	Phone      string  `json:"phone"`
	Notes      string  `json:"notes"`
}

// validateClientInput enforces the ADR 0023 business rule: SocialName is
// exclusive to Pessoa Física. Returns false (and has already written the
// response) when validation fails.
func validateClientInput(c *gin.Context, in clientInput) bool {
	if in.Type == "pj" && in.SocialName != nil && strings.TrimSpace(*in.SocialName) != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nome Social é exclusivo de Pessoa Física"})
		return false
	}
	return true
}

// decryptClientDocument populates the transient Document field from
// DocumentEnc. Read-path failures (missing key or bad ciphertext) never break
// the caller — they only log a warning and leave Document empty, mirroring
// the "leitura sem chave configurada não pode quebrar a listagem" contract.
func decryptClientDocument(client *models.Client) {
	if client.DocumentEnc == "" {
		return
	}
	if !cryptobox.IsConfigured() {
		slog.Warn("client: cryptobox não configurado — documento não será exibido", "clientId", client.ID)
		return
	}
	plain, err := cryptobox.Decrypt(client.DocumentEnc)
	if err != nil {
		slog.Warn("client: falha ao decifrar documento", "clientId", client.ID, "error", err.Error())
		return
	}
	client.Document = plain
}

// List returns the tenant's clients, optionally filtered by ?searchParam=
// (ILIKE against name/socialName). Soft-deleted clients are excluded
// automatically by GORM.
// @Summary      Listar clientes
// @Tags         clients
// @Produce      json
// @Param        searchParam  query     string  false  "Busca por nome ou nome social"
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /clients [get]
func (cc *ClientController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}

	query := db.Where(`"tenantId" = ?`, tenantID)
	if search := strings.TrimSpace(c.Query("searchParam")); search != "" {
		like := "%" + search + "%"
		query = query.Where(
			`name ILIKE ? OR "socialName" ILIKE ?`,
			like, like,
		)
	}

	var clients []models.Client
	if err := query.Order("name ASC").Find(&clients).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListClients")
		return
	}

	for i := range clients {
		decryptClientDocument(&clients[i])
	}

	c.JSON(http.StatusOK, gin.H{"clients": clients})
}

// Show returns a single client by :id.
// @Summary      Detalhar cliente
// @Tags         clients
// @Produce      json
// @Param        id  path  int  true  "ID do cliente"
// @Success      200  {object}  models.Client
// @Security     BearerAuth
// @Router       /clients/{id} [get]
func (cc *ClientController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	id, ok := utils.ParseIntParam(c, "id")
	if !ok {
		return
	}

	var client models.Client
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&client).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "cliente não encontrado"})
		return
	}
	decryptClientDocument(&client)
	c.JSON(http.StatusOK, client)
}

// Create inserts a new client. Document (plain text in the payload) is
// encrypted at-rest via cryptobox — fail-closed when the key is unavailable.
// @Summary      Criar cliente
// @Tags         clients
// @Accept       json
// @Produce      json
// @Success      201  {object}  models.Client
// @Security     BearerAuth
// @Router       /clients [post]
func (cc *ClientController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	var in clientInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	if !validateClientInput(c, in) {
		return
	}

	encDoc := ""
	if strings.TrimSpace(in.Document) != "" {
		if !cryptobox.IsConfigured() {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Criptografia de documento não configurada"})
			return
		}
		e, err := cryptobox.Encrypt(in.Document)
		if err != nil {
			utils.RespondWithInternalError(c, err, "EncryptClientDocument")
			return
		}
		encDoc = e
	}

	client := models.Client{
		// TenantID always comes from the auth context, never trust the payload.
		TenantID:    tenantID,
		Type:        in.Type,
		Name:        in.Name,
		SocialName:  in.SocialName,
		DocumentEnc: encDoc,
		Email:       in.Email,
		Phone:       in.Phone,
		Notes:       in.Notes,
	}
	if err := db.Session(&gorm.Session{NewDB: true}).Create(&client).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateClient")
		return
	}

	client.Document = in.Document
	c.JSON(http.StatusCreated, client)
}

// Update edits a client by :id. Document is only re-encrypted when a
// non-empty value is sent — an empty/absent document leaves the existing
// DocumentEnc untouched.
// @Summary      Atualizar cliente
// @Tags         clients
// @Accept       json
// @Produce      json
// @Param        id  path  int  true  "ID do cliente"
// @Success      200  {object}  models.Client
// @Security     BearerAuth
// @Router       /clients/{id} [put]
func (cc *ClientController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	id, ok := utils.ParseIntParam(c, "id")
	if !ok {
		return
	}

	var existing models.Client
	if err := db.Session(&gorm.Session{NewDB: true}).Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&existing).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "cliente não encontrado"})
		return
	}

	var in clientInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	if !validateClientInput(c, in) {
		return
	}

	fields := map[string]interface{}{
		"type":       in.Type,
		"name":       in.Name,
		"socialName": in.SocialName,
		"email":      in.Email,
		"phone":      in.Phone,
		"notes":      in.Notes,
	}
	if strings.TrimSpace(in.Document) != "" {
		if !cryptobox.IsConfigured() {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Criptografia de documento não configurada"})
			return
		}
		enc, err := cryptobox.Encrypt(in.Document)
		if err != nil {
			utils.RespondWithInternalError(c, err, "EncryptClientDocument")
			return
		}
		fields["documentEnc"] = enc
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Client{}).
		Where(`id = ? AND "tenantId" = ?`, id, tenantID).Updates(fields).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateClient")
		return
	}

	var updated models.Client
	if err := db.Session(&gorm.Session{NewDB: true}).Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&updated).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ReloadClientAfterUpdate")
		return
	}
	decryptClientDocument(&updated)
	c.JSON(http.StatusOK, updated)
}

// Delete soft-deletes a client by :id — Client embeds gorm.DeletedAt, so a
// scoped Delete() sets deletedAt instead of removing the row (ADR 0023: never
// hard delete).
// @Summary      Remover cliente
// @Tags         clients
// @Produce      json
// @Param        id  path  int  true  "ID do cliente"
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /clients/{id} [delete]
func (cc *ClientController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	id, ok := utils.ParseIntParam(c, "id")
	if !ok {
		return
	}

	res := db.Session(&gorm.Session{NewDB: true}).Where(`id = ? AND "tenantId" = ?`, id, tenantID).Delete(&models.Client{})
	if res.Error != nil {
		utils.RespondWithInternalError(c, res.Error, "DeleteClient")
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "cliente não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Cliente removido"})
}
