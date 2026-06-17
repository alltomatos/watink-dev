package controllers

import (
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PipelineController encapsulates pipeline operations with RLS-scoped DB from auth middleware.
// All queries are automatically tenant-scoped via auth.GetScoped.
type PipelineController struct{}

func NewPipelineController() *PipelineController {
	return &PipelineController{}
}

// @Summary      Listar pipelines
// @Tags         pipelines
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /pipelines [get]
func (pc *PipelineController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Pipelines")
	if !ok {
		return
	}

	var pipelines []models.Pipeline
	if err := db.Where("\"tenantId\" = ?", tenantID).Preload("Stages").Find(&pipelines).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListPipelines")
		return
	}

	c.JSON(200, pipelines)
}

// @Summary      Criar pipeline
// @Tags         pipelines
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados do pipeline"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /pipelines [post]
func (pc *PipelineController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Pipelines")
	if !ok {
		return
	}

	var input createPipelineInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	pipeline := models.Pipeline{
		Name:     input.Name,
		TenantID: tenantID,
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&pipeline).Error; err != nil {
			return err
		}
		for i, st := range input.Stages {
			if strings.TrimSpace(st.Name) == "" {
				continue
			}
			if err := tx.Create(&models.PipelineStage{Name: st.Name, PipelineID: pipeline.ID, Order: i}).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.RespondWithInternalError(c, err, "CreatePipeline")
		return
	}

	db.Where("id = ?", pipeline.ID).Preload("Stages").First(&pipeline)
	c.JSON(200, pipeline)
}

// @Summary      Atualizar pipeline
// @Tags         pipelines
// @Accept       json
// @Produce      json
// @Param        pipelineId  path      int                     true  "ID do pipeline"
// @Param        body        body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200         {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /pipelines/{pipelineId} [put]
func (pc *PipelineController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Pipelines")
	if !ok {
		return
	}
	id := c.Param("pipelineId")

	var pipeline models.Pipeline
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Preload("Stages").First(&pipeline).Error; err != nil {
		c.JSON(404, gin.H{"error": "Pipeline not found"})
		return
	}

	var input updatePipelineInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if strings.TrimSpace(input.Name) != "" {
		pipeline.Name = input.Name
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("\"tenantId\" = ?", tenantID).Save(&pipeline).Error; err != nil {
			return err
		}

		if input.Stages != nil {
			if err := tx.Where("\"pipelineId\" = ?", pipeline.ID).Delete(&models.PipelineStage{}).Error; err != nil {
				return err
			}
			for i, st := range input.Stages {
				if strings.TrimSpace(st.Name) == "" {
					continue
				}
				if err := tx.Create(&models.PipelineStage{Name: st.Name, PipelineID: pipeline.ID, Order: i}).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		utils.RespondWithInternalError(c, err, "UpdatePipeline")
		return
	}

	db.Where("id = ?", pipeline.ID).Preload("Stages").First(&pipeline)
	c.JSON(200, pipeline)
}

// @Summary      Importar pipeline
// @Tags         pipelines
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados do pipeline"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /pipelines/import [post]
func (pc *PipelineController) Import(c *gin.Context) {
	pc.Create(c)
}

// @Summary      Exportar pipeline
// @Tags         pipelines
// @Produce      json
// @Param        pipelineId  path      int  true  "ID do pipeline"
// @Success      200         {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /pipelines/export/{pipelineId} [get]
func (pc *PipelineController) Export(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Pipelines")
	if !ok {
		return
	}
	id := c.Param("pipelineId")

	var pipeline models.Pipeline
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Preload("Stages").First(&pipeline).Error; err != nil {
		c.JSON(404, gin.H{"error": "Pipeline not found"})
		return
	}

	c.JSON(200, pipeline)
}

// @Summary      Sugestão IA de pipeline
// @Description  Gera sugestão de pipeline com IA baseada em contexto de atendimento
// @Tags         pipelines
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Mensagens de contexto"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /pipelines/ai-suggest [post]
func (pc *PipelineController) AISuggest(c *gin.Context) {
	var req struct {
		Messages []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	last := ""
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if strings.TrimSpace(req.Messages[i].Content) != "" {
			last = req.Messages[i].Content
			break
		}
	}

	stages := []string{"Novo", "Qualificação", "Em Andamento", "Fechado"}
	if strings.Contains(strings.ToLower(last), "suporte") || strings.Contains(strings.ToLower(last), "helpdesk") {
		stages = []string{"Novo", "Triagem", "Atendimento", "Resolvido"}
	}

	c.JSON(200, gin.H{
		"message": "Sugestão gerada com sucesso.",
		"stages":  stages,
	})
}

type createPipelineInput struct {
	Name   string `json:"name"`
	Stages []struct {
		Name string `json:"name"`
	} `json:"stages"`
}

type updatePipelineInput struct {
	Name   string `json:"name"`
	Stages []struct {
		Name string `json:"name"`
	} `json:"stages"`
}
