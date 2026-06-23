package controllers

import (
	"net/http"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/render"
	"gorm.io/gorm"
)

// TagController encapsulates tag operations with RLS-scoped DB from auth middleware.
// All queries are automatically tenant-scoped via auth.GetScoped.
type TagController struct{}

func NewTagController() *TagController {
	return &TagController{}
}

// List returns all tags for the current tenant, optionally including archived.
// @Summary      Listar tags
// @Tags         tags
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /tags [get]
func (tc *TagController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Tags")
	if !ok {
		return
	}

	includeArchived := c.Query("includeArchived") == "true"
	var tags []models.Tag
	q := db.Where("\"tenantId\" = ?", tenantID).Preload("Group")
	if !includeArchived {
		q = q.Where("archived = ?", false)
	}

	if err := q.Order("name ASC").Find(&tags).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListTags")
		return
	}

	result := make([]gin.H, 0, len(tags))
	for _, t := range tags {
		var usage int64
		db.Model(&models.EntityTag{}).Where("\"tenantId\" = ? AND \"tagId\" = ?", tenantID, t.ID).Count(&usage)
		result = append(result, gin.H{
			"id": t.ID, "name": t.Name, "color": t.Color, "icon": t.Icon,
			"description": t.Description, "archived": t.Archived, "groupId": t.GroupID,
			"tenantId": t.TenantID, "group": t.Group, "usageCount": usage,
		})
	}

	c.JSON(http.StatusOK, result)
}

// @Summary      Remover tag
// @Tags         tags
// @Produce      json
// @Param        id  path      int  true  "ID da tag"
// @Success      200 {object}  map[string]string
// @Security     BearerAuth
// @Router       /tags/{id} [delete]
func (tc *TagController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Tags")
	if !ok {
		return
	}
	id := c.Param("id")
	forceDelete := c.Query("forceDelete") == "true"

	var tag models.Tag
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&tag).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}

	if forceDelete {
		res := db.Session(&gorm.Session{NewDB: true}).
			Where("\"tenantId\" = ? AND \"tagId\" = ?", tenantID, tag.ID).
			Delete(&models.EntityTag{})
		if res.Error != nil {
			utils.RespondWithInternalError(c, res.Error, "DeleteEntityTags")
			return
		}

		if err := db.Delete(&tag).Error; err != nil {
			utils.RespondWithInternalError(c, err, "DeleteTag")
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Tag deleted"})
		return
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Model(&tag).Update("archived", true).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ArchiveTag")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag archived"})
}

func defaultStringTag(v, d string) string {
	if strings.TrimSpace(v) == "" {
		return d
	}
	return v
}

// Ensure render import is used (Writer interface for future JSON responses)
var _ render.Render = nil
