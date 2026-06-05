package controllers

import (
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

// QueueController encapsulates queue operations with RLS-scoped DB from auth middleware.
// All queries are automatically tenant-scoped via auth.GetScoped.
type QueueController struct{}

func NewQueueController() *QueueController {
	return &QueueController{}
}

func (qc *QueueController) ListQueues(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Queues")
	if !ok {
		return
	}

	var queues []models.Queue
	if err := db.Where("\"tenantId\" = ?", tenantID).
		Preload("Whatsapps").
		Order("COALESCE(\"parentId\", id), \"parentId\" IS NOT NULL, name ASC").
		Find(&queues).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListQueues")
		return
	}

	c.JSON(200, queues)
}

func (qc *QueueController) ShowQueue(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Queues")
	if !ok {
		return
	}
	id := c.Param("queueId")

	var queue models.Queue
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		First(&queue).Error; err != nil {
		c.JSON(404, gin.H{"error": "Queue not found"})
		return
	}

	c.JSON(200, queue)
}

func (qc *QueueController) CreateQueue(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Queues")
	if !ok {
		return
	}

	limitService := services.NewPlanLimitService(db)
	if err := limitService.CheckLimit(tenantID, "queues"); err != nil {
		utils.RespondWithServiceError(c, 403, err, "Plan limit reached for queues")
		return
	}

	var input models.Queue
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	input.TenantID = tenantID
	if err := db.Create(&input).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateQueue")
		return
	}

	c.JSON(200, input)
}

func (qc *QueueController) UpdateQueue(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Queues")
	if !ok {
		return
	}
	id := c.Param("queueId")

	var queue models.Queue
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&queue).Error; err != nil {
		c.JSON(404, gin.H{"error": "Queue not found"})
		return
	}

	if err := c.ShouldBindJSON(&queue); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if err := db.Where("\"tenantId\" = ?", tenantID).Save(&queue).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateQueue")
		return
	}

	c.JSON(200, queue)
}

func (qc *QueueController) DeleteQueue(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Queues")
	if !ok {
		return
	}
	id := c.Param("queueId")

	result := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.Queue{})
	if result.Error != nil {
		utils.RespondWithInternalError(c, result.Error, "DeleteQueue")
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(404, gin.H{"error": "Queue not found"})
		return
	}

	c.JSON(200, gin.H{"message": "Queue deleted successfully"})
}
