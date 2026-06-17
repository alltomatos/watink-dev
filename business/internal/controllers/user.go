package controllers

import (
	"net/http"
	"strconv"

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
func (uc *UserController) CreateUser(c *gin.Context) {
	_, tenantID, ok := auth.GetScoped(c, "Users")
	if !ok {
		return
	}

	// SaaS Limit Check
	if err := uc.planLimitSvc.CheckLimit(tenantID, "users"); err != nil {
		utils.RespondWithServiceError(c, http.StatusForbidden, err, "User limit reached for this plan")
		return
	}

	var input models.User
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	domainUser := &domain.User{
		Name:         input.Name,
		Email:        input.Email,
		PasswordHash: input.PasswordHash,
		TenantID:     tenantID,
		Profile:      input.Profile,
		WhatsappID:   input.WhatsappID,
		GroupID:      input.GroupID,
		Configs:      input.Configs,
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
		tmp := models.User{PasswordHash: user.PasswordHash}
		if err := tmp.HashPassword(pwd); err != nil {
			utils.RespondWithInternalError(c, err, "HashPassword")
			return
		}
		updateMap["passwordHash"] = tmp.PasswordHash
	}

	// Scalar fields
	if v, ok := req["name"].(string); ok {
		updateMap["name"] = v
	}
	if v, ok := req["email"].(string); ok {
		updateMap["email"] = v
	}
	if v, ok := req["profile"].(string); ok {
		updateMap["profile"] = v
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
