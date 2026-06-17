package controllers

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/plugins"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

type SetupController struct {
	setupService domain.SetupServiceInterface
	hubManager   *plugins.HubManager
}

func NewSetupController(setupService domain.SetupServiceInterface, hubManager *plugins.HubManager) *SetupController {
	return &SetupController{
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
	needs, err := ctrl.setupService.NeedsSetup(c.Request.Context())
	if err != nil {
		utils.RespondWithInternalError(c, err, "CheckSetup")
		return
	}
	c.JSON(http.StatusOK, gin.H{"needsSetup": needs})
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
	needs, err := ctrl.setupService.NeedsSetup(c.Request.Context())
	if err != nil {
		utils.RespondWithInternalError(c, err, "InitialSetup")
		return
	}
	if !needs {
		c.JSON(http.StatusForbidden, gin.H{"error": "System already initialized"})
		return
	}

	var req SetupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	seedData := domain.TenantSeedData{
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
