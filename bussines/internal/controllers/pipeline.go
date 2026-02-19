package controllers

import (
	"net/http"
	"strings"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/gin-gonic/gin"
)

func ListPipelines(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var pipelines []models.Pipeline
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Preload("Stages").Find(&pipelines).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch pipelines"})
		return
	}

	c.JSON(http.StatusOK, pipelines)
}

func CreatePipeline(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var pipeline models.Pipeline
	if err := c.ShouldBindJSON(&pipeline); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pipeline.TenantID = tenantID
	if err := database.DB.Create(&pipeline).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create pipeline"})
		return
	}

	c.JSON(http.StatusOK, pipeline)
}

func UpdatePipeline(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("pipelineId")

	var pipeline models.Pipeline
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Preload("Stages").First(&pipeline).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pipeline not found"})
		return
	}

	var payload struct {
		Name   string `json:"name"`
		Stages []struct {
			Name string `json:"name"`
		} `json:"stages"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if strings.TrimSpace(payload.Name) != "" {
		pipeline.Name = payload.Name
	}
	if err := database.DB.Save(&pipeline).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update pipeline"})
		return
	}

	if payload.Stages != nil {
		_ = database.DB.Where("\"pipelineId\" = ?", pipeline.ID).Delete(&models.PipelineStage{}).Error
		for i, st := range payload.Stages {
			if strings.TrimSpace(st.Name) == "" {
				continue
			}
			_ = database.DB.Create(&models.PipelineStage{Name: st.Name, PipelineID: pipeline.ID, Order: i}).Error
		}
		_ = database.DB.Where("id = ?", pipeline.ID).Preload("Stages").First(&pipeline).Error
	}

	c.JSON(http.StatusOK, pipeline)
}

func ImportPipeline(c *gin.Context) {
	// payload esperado do frontend já é compatível com criação
	CreatePipeline(c)
}

func ExportPipeline(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("pipelineId")

	var pipeline models.Pipeline
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Preload("Stages").First(&pipeline).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pipeline not found"})
		return
	}

	c.JSON(http.StatusOK, pipeline)
}

func AISuggestPipeline(c *gin.Context) {
	var req struct {
		Messages []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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

	c.JSON(http.StatusOK, gin.H{
		"message": "Sugestão gerada com sucesso.",
		"stages":  stages,
	})
}
