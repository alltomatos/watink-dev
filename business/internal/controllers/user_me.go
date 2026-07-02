package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

// currentUserID extrai o id do usuário autenticado do contexto. Claims do JWT
// decodificam números como float64 (encoding/json), mesmo padrão dos demais
// controllers.
func currentUserID(c *gin.Context) (int, bool) {
	v, ok := c.Get("userId")
	if !ok || v == nil {
		return 0, false
	}
	switch n := v.(type) {
	case float64:
		return int(n), true
	case int:
		return n, true
	case string:
		id, err := strconv.Atoi(n)
		return id, err == nil
	default:
		return 0, false
	}
}

// GetMe returns the authenticated user's OWN profile — self-service, SEM
// RequirePermission. Um Atendente comum (sem users:read) usa este endpoint
// para abrir "Meu perfil"; o id vem do token, nunca da URL, então jamais
// expõe dado de terceiros.
//
// @Summary      Meu perfil
// @Tags         users
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /me [get]
func (uc *UserController) GetMe(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Users")
	if !ok {
		return
	}
	uid, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user context"})
		return
	}

	userModel, err := uc.userRepo.FindByIDDetail(c.Request.Context(), uid, tenantID)
	if err != nil || userModel == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         userModel.ID,
		"name":       userModel.Name,
		"email":      userModel.Email,
		"alcance":    userModel.Alcance,
		"whatsappId": userModel.WhatsappID,
		"tenantId":   userModel.TenantID,
		"cargoId":    userModel.CargoID,
		"configs":    userModel.Configs,
	})
}

// UpdateMe updates ONLY the authenticated user's own profile fields —
// name/email/password/whatsappId. NUNCA aceita alcance/cargoId/setores: mudar
// esses campos exige gestão de acessos (Central de Acessos +
// RequirePermission). Campos de RBAC que venham no payload são silenciosamente
// ignorados — este é o caminho sem-gate, então ele mesmo tem de fechar o vetor
// de auto-promoção (P1-1), não confiar em middleware.
//
// @Summary      Atualizar meu perfil
// @Tags         users
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "name/email/password/whatsappId"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /me [put]
func (uc *UserController) UpdateMe(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Users")
	if !ok {
		return
	}
	uid, ok := currentUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user context"})
		return
	}

	user, err := uc.userRepo.FindByID(c.Request.Context(), uid, tenantID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	// Whitelist estrita: só campos de perfil. alcance/cargoId/setores nunca são
	// lidos aqui, então não há como se auto-promover por este endpoint.
	updateMap := make(map[string]interface{})

	if pwd, ok := req["password"].(string); ok && pwd != "" {
		if _, err := utils.ValidateStringField(pwd, "password", 128); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := validatePasswordStrength(pwd); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		tmp := models.User{PasswordHash: user.PasswordHash}
		if err := tmp.HashPassword(pwd); err != nil {
			utils.RespondWithInternalError(c, err, "HashPassword")
			return
		}
		updateMap["passwordHash"] = tmp.PasswordHash
	}
	if v, ok := req["name"].(string); ok {
		name, err := utils.ValidateStringField(v, "name", 255)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		updateMap["name"] = name
	}
	if v, ok := req["email"].(string); ok {
		email, err := utils.ValidateStringField(v, "email", 255)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if !strings.Contains(email, "@") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "field 'email' must be a valid email address"})
			return
		}
		updateMap["email"] = normalizeEmail(email)
	}
	if v, ok := req["whatsappId"]; ok {
		if v == "" || v == nil {
			updateMap["whatsappId"] = nil
		} else {
			updateMap["whatsappId"] = formatInt(v)
		}
	}

	if len(updateMap) == 0 {
		c.JSON(http.StatusOK, user)
		return
	}

	if err := uc.userRepo.Update(c.Request.Context(), user, updateMap); err != nil {
		utils.RespondWithInternalError(c, err, "UpdateMe")
		return
	}

	c.JSON(http.StatusOK, user)
}
