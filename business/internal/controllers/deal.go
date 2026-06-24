package controllers

import (
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DealController struct{}

func NewDealController() *DealController {
	return &DealController{}
}

// @Summary      Listar deals do pipeline
// @Tags         deals
// @Produce      json
// @Param        pipelineId  query     int  true  "ID do pipeline"
// @Success      200         {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /deals [get]
func (dc *DealController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Deals")
	if !ok {
		return
	}

	pipelineIDStr := c.Query("pipelineId")
	if pipelineIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pipelineId is required"})
		return
	}
	pipelineID, err := strconv.Atoi(pipelineIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pipelineId"})
		return
	}

	// Verify pipeline belongs to tenant
	var stageIDs []int
	if err := db.Model(&models.PipelineStage{}).
		Joins(`JOIN "Pipelines" ON "Pipelines".id = "PipelineStages"."pipelineId"`).
		Where(`"Pipelines".id = ? AND "Pipelines"."tenantId" = ?`, pipelineID, tenantID).
		Pluck("PipelineStages.id", &stageIDs).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DealList")
		return
	}

	var deals []models.Deal
	if len(stageIDs) > 0 {
		if err := db.Where(`"stageId" IN ? AND "tenantId" = ?`, stageIDs, tenantID).
			Preload("Contact").
			Find(&deals).Error; err != nil {
			utils.RespondWithInternalError(c, err, "DealList")
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"deals": deals})
}

// @Summary      Atualizar deal
// @Tags         deals
// @Accept       json
// @Produce      json
// @Param        id    path      int                     true  "ID do deal"
// @Param        body  body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /deals/{id} [put]
func (dc *DealController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Deals")
	if !ok {
		return
	}
	id, ok2 := utils.ParseIntParam(c, "id")
	if !ok2 {
		return
	}

	var deal models.Deal
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&deal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Deal not found"})
		return
	}

	var input struct {
		StageID   *int     `json:"stageId"`
		Name      string   `json:"name"`
		Value     *float64 `json:"value"`
		Status    string   `json:"status"`
		ContactID *int     `json:"contactId"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if input.StageID != nil {
		deal.StageID = *input.StageID
	}
	if input.Name != "" {
		deal.Name = input.Name
	}
	if input.Value != nil {
		deal.Value = *input.Value
	}
	if input.Status != "" {
		deal.Status = input.Status
	}
	if input.ContactID != nil {
		deal.ContactID = *input.ContactID
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Save(&deal).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DealUpdate")
		return
	}

	c.JSON(http.StatusOK, deal)
}
