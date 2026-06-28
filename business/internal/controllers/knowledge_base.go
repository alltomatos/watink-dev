package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

// KnowledgeBaseController encapsulates knowledge base operations with RLS-scoped DB from auth middleware.
// All queries are automatically tenant-scoped via auth.GetDB(c).
type KnowledgeBaseController struct {
	publisher domain.KnowledgeJobPublisher
}

func NewKnowledgeBaseController(publisher domain.KnowledgeJobPublisher) *KnowledgeBaseController {
	return &KnowledgeBaseController{publisher: publisher}
}

// @Summary      Listar bases de conhecimento
// @Tags         knowledge-base
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /knowledge-bases [get]
func (kbc *KnowledgeBaseController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}

	var knowledgeBases []models.KnowledgeBase
	if err := db.Where("\"tenantId\" = ?", tenantID).Find(&knowledgeBases).Error; err != nil {
		utils.RespondWithInternalError(c, err, "Failed to fetch knowledge bases")
		return
	}

	c.JSON(http.StatusOK, knowledgeBases)
}

// @Summary      Detalhar base de conhecimento
// @Tags         knowledge-base
// @Produce      json
// @Param        knowledgeBaseId  path      int  true  "ID da base"
// @Success      200              {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /knowledge-bases/{knowledgeBaseId} [get]
func (kbc *KnowledgeBaseController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "KnowledgeBases")
	if !ok {
		return
	}
	id := c.Param("knowledgeBaseId")

	var knowledgeBase models.KnowledgeBase
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Preload("Sources").First(&knowledgeBase).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Knowledge base not found"})
		return
	}

	c.JSON(http.StatusOK, knowledgeBase)
}
