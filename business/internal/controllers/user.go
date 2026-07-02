package controllers

import (
	"math"
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserController struct {
	userRepo     domain.UserRepository
	planLimitSvc domain.PlanLimitServiceInterface
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
	db, tenantID, ok := auth.GetScoped(c, "Users")
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
		"alcance":    userModel.Alcance,
		"whatsappId": userModel.WhatsappID,
		"tenantId":   userModel.TenantID,
		"cargoId":    userModel.CargoID,
		"configs":    userModel.Configs,
		"createdAt":  userModel.CreatedAt,
		"updatedAt":  userModel.UpdatedAt,
	}

	// Adiciona relations apenas se existirem
	if len(userModel.Queues) > 0 {
		response["queues"] = userModel.Queues
	}
	if userModel.CargoID != nil {
		response["cargo"] = map[string]interface{}{
			"id":   userModel.Cargo.ID,
			"name": userModel.Cargo.Name,
		}
		if len(userModel.Cargo.Permissions) > 0 {
			permissions := make([]map[string]interface{}, len(userModel.Cargo.Permissions))
			for i, p := range userModel.Cargo.Permissions {
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
	}

	// Vínculos de Setor do usuário — incluídos aqui para o frontend não ter de
	// cruzar GET /setores/:id de todos os setores do tenant (N+1, P3-2).
	// Session(NewDB) obrigatório: o db de GetScoped já acumulou condições.
	type setorVinc struct {
		SetorID  int  `json:"setorId"`
		EhGestor bool `json:"ehGestor"`
	}
	var vincs []setorVinc
	if err := db.Session(&gorm.Session{NewDB: true}).
		Table("user_setores").
		Select(`"setorId", "ehGestor"`).
		Where(`"userId" = ?`, id).
		Scan(&vincs).Error; err == nil {
		response["setores"] = vincs
	}

	c.JSON(http.StatusOK, response)
}

// @Summary      Remover usuário
// @Tags         users
// @Produce      json
// @Param        userId  path      int  true  "ID do usuário"
// @Success      200     {object}  map[string]string
// @Security     BearerAuth
// @Router       /users/{userId} [delete]
func (uc *UserController) DeleteUser(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Users")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("userId"))

	// Anti-lockout (ADR 0022): nem o dono do tenant nem o último Administrador
	// podem ser excluídos — travaria a organização inteira pra fora do sistema.
	if isTenantOwner(db, id, tenantID) {
		c.JSON(http.StatusConflict, gin.H{"error": "não é possível excluir o dono do tenant"})
		return
	}
	if isLastAdminOfTenant(db, id, tenantID) {
		c.JSON(http.StatusConflict, gin.H{"error": "não é possível excluir o último Administrador do tenant"})
		return
	}

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

// safeInt narrows an int64 to int, returning ok=false when the value falls
// outside the platform int range instead of silently truncating/overflowing.
func safeInt(n int64) (int, bool) {
	if n < math.MinInt || n > math.MaxInt {
		return 0, false
	}
	return int(n), true
}
