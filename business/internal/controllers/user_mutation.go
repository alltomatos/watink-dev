package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

// @Summary      Criar usuário
// @Tags         users
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados do usuário"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /users [post]
type createUserRequest struct {
	Name       string `json:"name" binding:"required"`
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required"`
	Alcance    string `json:"alcance"`
	WhatsappID *int   `json:"whatsappId"`
	CargoID    *int   `json:"cargoId"`
	Configs    string `json:"configs"`
}

func (uc *UserController) CreateUser(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Users")
	if !ok {
		return
	}

	if err := uc.planLimitSvc.CheckLimit(tenantID, "users"); err != nil {
		utils.RespondWithServiceError(c, http.StatusForbidden, err, "User limit reached for this plan")
		return
	}

	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if _, err := utils.ValidateStringField(req.Name, "name", 255); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(req.Password, "password", 128); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(req.Alcance, "alcance", 50); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(req.Configs, "configs", 65535); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tmp := models.User{}
	if err := tmp.HashPassword(req.Password); err != nil {
		utils.RespondWithInternalError(c, err, "HashPassword")
		return
	}

	alcance := req.Alcance
	if alcance == "" {
		alcance = "proprio"
	}

	configs := req.Configs
	if configs == "" {
		configs = "{}"
	}

	domainUser := &domain.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: tmp.PasswordHash,
		TenantID:     tenantID,
		Alcance:      alcance,
		WhatsappID:   req.WhatsappID,
		CargoID:      req.CargoID,
		Configs:      configs,
	}

	if err := uc.userRepo.Create(c.Request.Context(), domainUser); err != nil {
		utils.RespondWithInternalError(c, err, "CreateUser")
		return
	}

	c.JSON(http.StatusOK, domainUser)
}

// @Summary      Atualizar usuário
// @Tags         users
// @Accept       json
// @Produce      json
// @Param        userId  path      int                     true  "ID do usuário"
// @Param        body    body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200     {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /users/{userId} [put]
func (uc *UserController) UpdateUser(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Users")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("userId"))

	user, err := uc.userRepo.FindByID(c.Request.Context(), id, tenantID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found or access denied"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	updateMap := make(map[string]interface{})

	// Password: hash before persisting
	if pwd, ok := req["password"].(string); ok && pwd != "" {
		if _, err := utils.ValidateStringField(pwd, "password", 128); err != nil {
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

	// Scalar fields
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
		updateMap["email"] = email
	}
	if v, ok := req["alcance"].(string); ok {
		alcance, err := utils.ValidateStringField(v, "alcance", 50)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		updateMap["alcance"] = alcance
	}
	if v, ok := req["whatsappId"]; ok {
		if v == "" || v == nil {
			updateMap["whatsappId"] = nil
		} else {
			s := formatInt(v)
			updateMap["whatsappId"] = s
		}
	}
	if v, ok := req["cargoId"]; ok {
		if v == "" || v == nil {
			updateMap["cargoId"] = nil
		} else {
			s := formatInt(v)
			updateMap["cargoId"] = s
		}
	}

	if err := uc.userRepo.Update(c.Request.Context(), user, updateMap); err != nil {
		utils.RespondWithInternalError(c, err, "UpdateUser")
		return
	}

	c.JSON(http.StatusOK, user)
}
