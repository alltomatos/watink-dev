package controllers

import (
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DealController struct{}

func NewDealController() *DealController {
	return &DealController{}
}

// dealStageBelongsToTenant returns true when stageID belongs to a pipeline owned
// by tenantID. Guards Create/Update against referencing another tenant's stage
// (which would also leak its pipeline name via Preload("Stage.Pipeline")).
func dealStageBelongsToTenant(db *gorm.DB, tenantID uuid.UUID, stageID int) bool {
	var n int64
	db.Session(&gorm.Session{NewDB: true}).
		Model(&models.PipelineStage{}).
		Joins(`JOIN "Pipelines" ON "Pipelines".id = "PipelineStages"."pipelineId"`).
		Where(`"PipelineStages".id = ? AND "Pipelines"."tenantId" = ?`, stageID, tenantID).
		Count(&n)
	return n > 0
}

// dealContactBelongsToTenant returns true when contactID is owned by tenantID.
func dealContactBelongsToTenant(db *gorm.DB, tenantID uuid.UUID, contactID int) bool {
	var n int64
	db.Session(&gorm.Session{NewDB: true}).
		Model(&models.Contact{}).
		Where(`id = ? AND "tenantId" = ?`, contactID, tenantID).
		Count(&n)
	return n > 0
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

	// ticketId mode: return deals linked to a specific ticket
	if ticketIDStr := c.Query("ticketId"); ticketIDStr != "" {
		ticketID, err := strconv.Atoi(ticketIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticketId"})
			return
		}
		var deals []models.Deal
		if err := db.Session(&gorm.Session{NewDB: true}).
			Where(`"ticketId" = ? AND "tenantId" = ?`, ticketID, tenantID).
			Preload("Contact.Client").
			Preload("Stage.Pipeline").
			Find(&deals).Error; err != nil {
			utils.RespondWithInternalError(c, err, "DealListByTicket")
			return
		}
		c.JSON(http.StatusOK, gin.H{"deals": deals})
		return
	}

	pipelineIDStr := c.Query("pipelineId")
	if pipelineIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pipelineId or ticketId is required"})
		return
	}
	pipelineID, err := strconv.Atoi(pipelineIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pipelineId"})
		return
	}

	// Collect stage IDs for the pipeline (NewDB avoids scope accumulation on PipelineStages)
	freshDB := db.Session(&gorm.Session{NewDB: true})
	var stageIDs []int
	if err := freshDB.Model(&models.PipelineStage{}).
		Joins(`JOIN "Pipelines" ON "Pipelines".id = "PipelineStages"."pipelineId"`).
		Where(`"Pipelines".id = ? AND "Pipelines"."tenantId" = ?`, pipelineID, tenantID).
		Pluck(`"PipelineStages".id`, &stageIDs).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DealList")
		return
	}

	var deals []models.Deal
	if len(stageIDs) > 0 {
		if err := db.Where(`"stageId" IN ? AND "tenantId" = ?`, stageIDs, tenantID).
			Preload("Contact.Client").
			Find(&deals).Error; err != nil {
			utils.RespondWithInternalError(c, err, "DealList")
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"deals": deals})
}

// @Summary      Criar deal
// @Tags         deals
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados do deal"
// @Success      201   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /deals [post]
func (dc *DealController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Deals")
	if !ok {
		return
	}

	var input struct {
		Name      string   `json:"name" binding:"required"`
		StageID   int      `json:"stageId" binding:"required"`
		ContactID int      `json:"contactId" binding:"required"`
		TicketID  *int     `json:"ticketId"`
		Value     *float64 `json:"value"`
		Status    string   `json:"status"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if !dealStageBelongsToTenant(db, tenantID, input.StageID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "stageId inválido para este tenant"})
		return
	}
	if !dealContactBelongsToTenant(db, tenantID, input.ContactID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "contactId inválido para este tenant"})
		return
	}

	deal := models.Deal{
		Name:      input.Name,
		StageID:   input.StageID,
		ContactID: input.ContactID,
		TicketID:  input.TicketID,
		TenantID:  tenantID,
		Status:    "open",
	}
	if input.Value != nil {
		deal.Value = *input.Value
	}
	if input.Status != "" {
		deal.Status = input.Status
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Create(&deal).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DealCreate")
		return
	}

	c.JSON(http.StatusCreated, deal)
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

	if input.StageID != nil && !dealStageBelongsToTenant(db, tenantID, *input.StageID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "stageId inválido para este tenant"})
		return
	}
	if input.ContactID != nil && !dealContactBelongsToTenant(db, tenantID, *input.ContactID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "contactId inválido para este tenant"})
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
