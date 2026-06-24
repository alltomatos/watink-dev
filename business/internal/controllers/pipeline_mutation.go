package controllers

import (
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

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

	pipelineName, err := utils.ValidateStringField(input.Name, "name", 255)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	for i, st := range input.Stages {
		if _, err := utils.ValidateStringField(st.Name, "stage.name", 100); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		_ = i
	}

	pipeline := models.Pipeline{
		Name:     pipelineName,
		TenantID: tenantID,
	}

	err = db.Transaction(func(tx *gorm.DB) error {
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
		updName, err := utils.ValidateStringField(input.Name, "name", 255)
		if err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		pipeline.Name = updName
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Session(&gorm.Session{NewDB: true}).Save(&pipeline).Error; err != nil {
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
