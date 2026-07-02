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

// validEntityTypes is the closed set of entities that can carry EntityTags.
var validEntityTypes = map[string]bool{"ticket": true, "contact": true}

// @Summary      Listar grupos de tags
// @Tags         tags
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /tag-groups [get]
func (tc *TagController) ListGroups(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Tags")
	if !ok {
		return
	}
	var groups []models.TagGroup
	if err := db.Where("\"tenantId\" = ?", tenantID).Order("name ASC").Find(&groups).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListTagGroups")
		return
	}
	c.JSON(http.StatusOK, groups)
}

// @Summary      Listar tags de entidade
// @Tags         tags
// @Produce      json
// @Param        entityType  path      string  true  "Tipo da entidade (ticket, contact)"
// @Param        id          path      int     true  "ID da entidade"
// @Success      200         {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /entities/{entityType}/{id}/tags [get]
func (tc *TagController) GetEntityTags(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Tags")
	if !ok {
		return
	}
	entityType := c.Param("entityType")
	if !validEntityTypes[entityType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid entityType: must be 'ticket' or 'contact'"})
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))

	// Two unambiguous single-table queries instead of a join: GetScoped's
	// tenant Where("\"tenantId\" = ?") is unqualified, so joining EntityTags
	// (which also has a tenantId column) with the scoped db would make the
	// column reference ambiguous to Postgres.
	var tagIDs []int
	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.EntityTag{}).
		Where("\"tenantId\" = ? AND \"entityType\" = ? AND \"entityId\" = ?", tenantID, entityType, id).
		Pluck("\"tagId\"", &tagIDs).Error; err != nil {
		utils.RespondWithInternalError(c, err, "GetEntityTags")
		return
	}

	tags := []models.Tag{}
	if len(tagIDs) > 0 {
		if err := db.Where("id IN ?", tagIDs).Order("name ASC").Find(&tags).Error; err != nil {
			utils.RespondWithInternalError(c, err, "GetEntityTags")
			return
		}
	}

	c.JSON(http.StatusOK, tags)
}

// @Summary      Sincronizar tags de entidade
// @Tags         tags
// @Accept       json
// @Produce      json
// @Param        entityType  path      string                  true  "Tipo da entidade (ticket, contact)"
// @Param        id          path      int                     true  "ID da entidade"
// @Param        body        body      map[string]interface{}  true  "Lista de tag IDs"
// @Success      200         {object}  map[string]string
// @Security     BearerAuth
// @Router       /entities/{entityType}/{id}/tags/sync [put]
func (tc *TagController) SyncEntityTags(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Tags")
	if !ok {
		return
	}
	entityType := c.Param("entityType")
	if !validEntityTypes[entityType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid entityType: must be 'ticket' or 'contact'"})
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))

	var payload struct {
		TagIDs []int `json:"tagIds"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("\"tenantId\" = ? AND \"entityType\" = ? AND \"entityId\" = ?", tenantID, entityType, id).Delete(&models.EntityTag{}).Error; err != nil {
			return err
		}
		for _, tagID := range payload.TagIDs {
			if err := tx.Create(&models.EntityTag{TagID: tagID, EntityType: entityType, EntityID: id, TenantID: tenantID}).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		utils.RespondWithInternalError(c, err, "SyncEntityTags")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tags synced"})
}
