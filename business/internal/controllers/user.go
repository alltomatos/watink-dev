package controllers

import (
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/gin-gonic/gin"
)

type UserController struct {
	userRepo domain.UserRepository
}

func NewUserController(ur domain.UserRepository) *UserController {
	return &UserController{userRepo: ur}
}

func (uc *UserController) ListUsers(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	users, err := uc.userRepo.FindAll(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
	})
}

func (uc *UserController) ShowUser(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
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

func (uc *UserController) CreateUser(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	// SaaS Limit Check
	limitService := services.NewPlanLimitService()
	if err := limitService.CheckLimit(tenantID, "users"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	var input models.User
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusOK, domainUser)
}

func (uc *UserController) UpdateUser(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updateMap := make(map[string]interface{})

	// Password: hash before persisting
	if pwd, ok := req["password"].(string); ok && pwd != "" {
		tmp := models.User{PasswordHash: user.PasswordHash}
		if err := tmp.HashPassword(pwd); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (uc *UserController) DeleteUser(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id, _ := strconv.Atoi(c.Param("userId"))

	if err := uc.userRepo.Delete(c.Request.Context(), id, tenantID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
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
