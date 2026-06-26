package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// QuickAnswerController encapsulates quick answer operations with RLS-scoped DB from auth middleware.
// All queries are automatically tenant-scoped via auth.GetDB(c).
type QuickAnswerController struct{}

func NewQuickAnswerController() *QuickAnswerController {
	return &QuickAnswerController{}
}

// @Summary      Listar respostas rápidas
// @Tags         quick-answers
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /quickAnswers [get]
func (qac *QuickAnswerController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}

	var quickAnswers []models.QuickAnswer
	if err := db.Where("\"tenantId\" = ?", tenantID).Order("shortcut ASC").Find(&quickAnswers).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListQuickAnswers")
		return
	}

	c.JSON(http.StatusOK, quickAnswers)
}

// @Summary      Detalhar resposta rápida
// @Tags         quick-answers
// @Produce      json
// @Param        quickAnswerId  path      int  true  "ID da resposta rápida"
// @Success      200            {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /quickAnswers/{quickAnswerId} [get]
func (qac *QuickAnswerController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}
	id := c.Param("quickAnswerId")

	var quickAnswer models.QuickAnswer
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&quickAnswer).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ShowQuickAnswer")
		return
	}

	c.JSON(http.StatusOK, quickAnswer)
}

type updateQuickAnswerInput struct {
	Shortcut  string `json:"shortcut"`
	Message   string `json:"message"`
	MediaType string `json:"mediaType"`
	DataJson  string `json:"dataJson"`
	Type      string `json:"type"`
	Content   string `json:"content"`
}

// maxQuickAnswerMessageLen is the maximum allowed length for a quick answer message body.
const maxQuickAnswerMessageLen = 65535

// @Summary      Criar resposta rápida
// @Tags         quick-answers
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados da resposta"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /quickAnswers [post]
func (qac *QuickAnswerController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}

	var qa models.QuickAnswer
	if err := c.ShouldBindJSON(&qa); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if _, err := utils.ValidateStringField(qa.Shortcut, "shortcut", 100); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(qa.Message, "message", maxQuickAnswerMessageLen); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := utils.ValidateStringField(qa.MediaType, "mediaType", 50); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	qa.TenantID = tenantID
	if qa.Type == "" {
		qa.Type = "text"
	}
	if err := db.Create(&qa).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateQuickAnswer")
		return
	}

	c.JSON(http.StatusOK, qa)
}

// @Summary      Atualizar resposta rápida
// @Tags         quick-answers
// @Accept       json
// @Produce      json
// @Param        quickAnswerId  path      int                     true  "ID da resposta"
// @Param        body           body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200            {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /quickAnswers/{quickAnswerId} [put]
func (qac *QuickAnswerController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}
	id := c.Param("quickAnswerId")

	var qa models.QuickAnswer
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&qa).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateQuickAnswer-Fetch")
		return
	}

	var input updateQuickAnswerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	shortcut, err := utils.ValidateStringField(input.Shortcut, "shortcut", 100)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	message, err := utils.ValidateStringField(input.Message, "message", maxQuickAnswerMessageLen)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	mediaType, err := utils.ValidateStringField(input.MediaType, "mediaType", 50)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	qa.Shortcut = shortcut
	qa.Message = message
	qa.MediaType = mediaType
	qa.DataJson = input.DataJson
	if input.Type != "" {
		qa.Type = input.Type
	}
	if input.Content != "" {
		qa.Content = input.Content
	}

	if err := db.Where("\"tenantId\" = ?", tenantID).Save(&qa).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateQuickAnswer-Save")
		return
	}

	c.JSON(http.StatusOK, qa)
}

// @Summary      Remover resposta rápida
// @Tags         quick-answers
// @Produce      json
// @Param        quickAnswerId  path      int  true  "ID da resposta"
// @Success      200            {object}  map[string]string
// @Security     BearerAuth
// @Router       /quickAnswers/{quickAnswerId} [delete]
func (qac *QuickAnswerController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "QuickAnswers")
	if !ok {
		return
	}
	id := c.Param("quickAnswerId")

	result := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.QuickAnswer{})
	if result.Error != nil {
		utils.RespondWithInternalError(c, result.Error, "DeleteQuickAnswer")
		return
	}
	if result.RowsAffected == 0 {
		utils.RespondWithInternalError(c, gorm.ErrRecordNotFound, "DeleteQuickAnswer-NotFound")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Quick answer deleted successfully"})
}
