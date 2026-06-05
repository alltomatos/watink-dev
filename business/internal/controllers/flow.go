package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// FlowController encapsulates flow operations with RLS-scoped DB from auth middleware.
// All queries are automatically tenant-scoped via auth.GetDB(c).
type FlowController struct{}

func NewFlowController() *FlowController {
	return &FlowController{}
}

func (fc *FlowController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Flows")
	if !ok {
		return
	}

	var flows []models.Flow
	if err := db.Where("\"tenantId\" = ?", tenantID).Find(&flows).Error; err != nil {
		utils.RespondWithInternalError(c, err, "Failed to fetch flows")
		return
	}

	c.JSON(http.StatusOK, flows)
}

type flowInput struct {
	Name   string         `json:"name" binding:"required"`
	Nodes  datatypes.JSON `json:"nodes"`
	Edges  datatypes.JSON `json:"edges"`
	Active bool           `json:"active"`
}

func (fc *FlowController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Flows")
	if !ok {
		return
	}

	var req flowInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	flow := models.Flow{
		Name:     req.Name,
		Nodes:    req.Nodes,
		Edges:    req.Edges,
		Active:   req.Active,
		TenantID: tenantID,
	}

	if err := db.Create(&flow).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateFlow")
		return
	}

	c.JSON(http.StatusOK, flow)
}

func (fc *FlowController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Flows")
	if !ok {
		return
	}
	id := c.Param("flowId")

	var flow models.Flow
	if err := db.Where("\"tenantId\" = ? AND id = ?", tenantID, id).First(&flow).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}

	c.JSON(http.StatusOK, flow)
}

func (fc *FlowController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Flows")
	if !ok {
		return
	}
	id := c.Param("flowId")

	var flow models.Flow
	if err := db.Where("\"tenantId\" = ? AND id = ?", tenantID, id).First(&flow).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}

	var req flowInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	flow.Name = req.Name
	flow.Nodes = req.Nodes
	flow.Edges = req.Edges
	flow.Active = req.Active

	if err := db.Where("\"tenantId\" = ?", tenantID).Save(&flow).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateFlow")
		return
	}

	c.JSON(http.StatusOK, flow)
}

func (fc *FlowController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Flows")
	if !ok {
		return
	}
	id := c.Param("flowId")

	result := db.Where("\"tenantId\" = ? AND id = ?", tenantID, id).Delete(&models.Flow{})
	if result.Error != nil {
		utils.RespondWithInternalError(c, result.Error, "DeleteFlow")
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Flow deleted successfully"})
}
