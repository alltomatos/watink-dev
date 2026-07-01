package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

type SetupController struct {
	setupService domain.SetupServiceInterface
}

func NewSetupController(setupService domain.SetupServiceInterface) *SetupController {
	return &SetupController{setupService: setupService}
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
	CompanyName string `json:"companyName" binding:"required"`
	FirstName   string `json:"firstName" binding:"required"`
	LastName    string `json:"lastName"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required"`
	Document    string `json:"document"`
	BackendURL  string `json:"backendUrl"`
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

	if _, err := utils.ValidateStringField(req.CompanyName, "companyName", 255); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(req.FirstName, "firstName", 100); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(req.LastName, "lastName", 100); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(req.Password, "password", 128); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(req.Document, "document", 50); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(req.BackendURL, "backendUrl", 2048); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	seedData := domain.TenantSeedData{
		CompanyName: req.CompanyName,
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Email:       req.Email,
		Password:    req.Password,
		Document:    req.Document,
		BackendURL:  req.BackendURL,
	}
	if err := ctrl.setupService.InitializeTenant(seedData); err != nil {
		utils.RespondWithInternalError(c, err, "InitializeTenant")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "System initialized successfully"})
}
