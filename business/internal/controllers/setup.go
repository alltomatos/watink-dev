package controllers

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/plugins"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SetupController struct {
	db           *gorm.DB
	setupService *services.SetupService
	hubManager   *plugins.HubManager
}

func NewSetupController(db *gorm.DB, setupService *services.SetupService, hubManager *plugins.HubManager) *SetupController {
	return &SetupController{
		db:           db,
		setupService: setupService,
		hubManager:   hubManager,
	}
}

// @Summary      Verificar setup inicial
// @Description  Retorna se o tenant precisa de configuração inicial
// @Tags         setup
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Router       /initial-setup/check [get]
func (ctrl *SetupController) CheckSetup(c *gin.Context) {
	var usersCount int64
	var tenantsCount int64

	ctrl.db.Model(&models.User{}).Count(&usersCount)
	ctrl.db.Model(&models.Tenant{}).Count(&tenantsCount)

	c.JSON(http.StatusOK, gin.H{"needsSetup": usersCount == 0 && tenantsCount == 0})
}

type SetupRequest struct {
	FirstName  string `json:"firstName" binding:"required"`
	LastName   string `json:"lastName"`
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required"`
	Document   string `json:"document"`
	BackendURL string `json:"backendUrl"`
}

// @Summary      Configuração inicial do tenant
// @Description  Cria o primeiro usuário admin e inicializa o tenant
// @Tags         setup
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados de configuração inicial"
// @Success      200   {object}  map[string]interface{}
// @Router       /initial-setup [post]
func (ctrl *SetupController) InitialSetup(c *gin.Context) {
	var usersCount int64
	var tenantsCount int64

	ctrl.db.Model(&models.User{}).Count(&usersCount)
	ctrl.db.Model(&models.Tenant{}).Count(&tenantsCount)

	if usersCount > 0 || tenantsCount > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "System already initialized"})
		return
	}

	var req SetupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	seedData := services.TenantSeedData{
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Email:      req.Email,
		Password:   req.Password,
		Document:   req.Document,
		BackendURL: req.BackendURL,
	}
	if err := ctrl.setupService.InitializeTenant(seedData); err != nil {
		utils.RespondWithInternalError(c, err, "InitializeTenant")
		return
	}

	// Register instance in Marketplace Hub (best effort, side effect)
	if ctrl.hubManager != nil {
		instanceURL := strings.TrimSpace(req.BackendURL)
		if instanceURL == "" {
			instanceURL = strings.TrimSpace(os.Getenv("FRONTEND_URL"))
		}
		if instanceURL == "" {
			instanceURL = strings.TrimSpace(os.Getenv("BACKEND_URL"))
		}

		err := ctrl.hubManager.RegisterInstance(map[string]string{
			"ownerEmail":      req.Email,
			"superAdminEmail": req.Email,
			"ownerName":       req.FirstName + " " + req.LastName,
			"document":        req.Document,
			"tenantName":      req.FirstName + "'s Workspace",
			"instanceUrl":     instanceURL,
		})
		if err != nil {
			log.Printf("⚠️ marketplace hub register failed: %v", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "System initialized successfully"})
}
