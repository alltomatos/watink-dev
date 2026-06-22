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

type UserController struct {
	userRepo      domain.UserRepository
	planLimitSvc  domain.PlanLimitServiceInterface
}

func NewUserController(ur domain.UserRepository, planLimitSvc domain.PlanLimitServiceInterface) *UserController {
	return &UserController{
		userRepo:     ur,
		planLimitSvc: planLimitSvc,
	}
}

// @Summary      Listar usuários
// @Tags         users
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /users [get]
func (uc *UserController) ListUsers(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Users")
	if !ok {
		return
	}

	users, err := uc.userRepo.FindAll(c.Request.Context(), tenantID)
	if err != nil {
		utils.RespondWithInternalError(c, err, "ListUsers")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
	})
}

// @Summary      Detalhar usuário
// @Tags         users
// @Produce      json
// @Param        userId  path      int  true  "ID do usuário"
// @Success      200     {object}  map[string]interface{}
// @Failure      404     {object}  map[string]string
// @Security     BearerAuth
// @Router       /users/{userId} [get]
func (uc *UserController) ShowUser(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Users")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("userId"))

	// Usa busca enriquecida com relations
	userModel, err := uc.userRepo.FindByIDDetail(c.Request.Context(), id, tenantID)
	if err != nil || userModel == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found or access denied"})
		return
	}

	// Monta resposta enriquecida
	response := map[string]interface{}{
		"id":         userModel.ID,
		"name":       userModel.Name,
		"email":      userModel.Email,
		"profile":    userModel.Profile,
		"whatsappId": userModel.WhatsappID,
		"tenantId":   userModel.TenantID,
		"groupId":    userModel.GroupID,
		"configs":    userModel.Configs,
		"createdAt":  userModel.CreatedAt,
		"updatedAt":  userModel.UpdatedAt,
	}

	// Adiciona relations apenas se existirem
	if len(userModel.Queues) > 0 {
		response["queues"] = userModel.Queues
	}
	if len(userModel.Permissions) > 0 {
		permissions := make([]map[string]interface{}, len(userModel.Permissions))
		for i, p := range userModel.Permissions {
			permissions[i] = map[string]interface{}{
				"id":          p.ID,
				"name":        p.GetName(),
				"resource":    p.Resource,
				"action":      p.Action,
				"description": p.Description,
			}
		}
		response["permissions"] = permissions
	}
	if len(userModel.Roles) > 0 {
		response["roles"] = userModel.Roles
	}

	c.JSON(http.StatusOK, response)
}

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
	Profile    string `json:"profile"`
	WhatsappID *int   `json:"whatsappId"`
	GroupID    *int   `json:"groupId"`
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
	if _, err := utils.ValidateStringField(req.Profile, "profile", 50); err != nil {
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

	profile := req.Profile
	if profile == "" {
		profile = "user"
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
		Profile:      profile,
		WhatsappID:   req.WhatsappID,
		GroupID:      req.GroupID,
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
	if v, ok := req["profile"].(string); ok {
		profile, err := utils.ValidateStringField(v, "profile", 50)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		updateMap["profile"] = profile
	}
	if v, ok := req["whatsappId"]; ok {
		if v == "" || v == nil {
			updateMap["whatsappId"] = nil
		} else {
			s := formatInt(v)
			updateMap["whatsappId"] = s
		}
	}
	if v, ok := req["groupId"]; ok {
		if v == "" || v == nil {
			updateMap["groupId"] = nil
		} else {
			s := formatInt(v)
			updateMap["groupId"] = s
		}
	}

	if err := uc.userRepo.Update(c.Request.Context(), user, updateMap); err != nil {
		utils.RespondWithInternalError(c, err, "UpdateUser")
		return
	}

	c.JSON(http.StatusOK, user)
}

// @Summary      Remover usuário
// @Tags         users
// @Produce      json
// @Param        userId  path      int  true  "ID do usuário"
// @Success      200     {object}  map[string]string
// @Security     BearerAuth
// @Router       /users/{userId} [delete]
func (uc *UserController) DeleteUser(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Users")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("userId"))

	if err := uc.userRepo.Delete(c.Request.Context(), id, tenantID); err != nil {
		utils.RespondWithInternalError(c, err, "DeleteUser")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func formatInt(v interface{}) int64 {
	switch n := v.(type) {
	case float64:
		return int64(n)
	case string:
		i, _ := strconv.ParseInt(n, 10, 64)
		return i
	default:
		return 0
	}
}
