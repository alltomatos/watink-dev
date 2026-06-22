package controllers

import (
	"net/http"
	"strconv"
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

// @Summary      Criar tag
// @Tags         tags
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados da tag"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /tags [post]
func (tc *TagController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Tags")
	if !ok {
		return
	}

	var input createTagInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	name, err := utils.ValidateStringField(input.Name, "name", 100)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	color, err := utils.ValidateStringField(input.Color, "color", 50)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	icon, err := utils.ValidateStringField(input.Icon, "icon", 100)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	description, err := utils.ValidateStringField(input.Description, "description", 500)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tag := models.Tag{
		Name:        name,
		Color:       defaultStringTag(color, "blue"),
		Icon:        icon,
		Description: description,
		Archived:    input.Archived,
		TenantID:    tenantID,
		GroupID:     input.GroupID,
	}

	if err := db.Create(&tag).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateTag")
		return
	}

	c.JSON(http.StatusOK, tag)
}

// @Summary      Atualizar tag
// @Tags         tags
// @Accept       json
// @Produce      json
// @Param        id    path      int                     true  "ID da tag"
// @Param        body  body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /tags/{id} [put]
func (tc *TagController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Tags")
	if !ok {
		return
	}
	id := c.Param("id")

	var tag models.Tag
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&tag).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}

	var input updateTagInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	updName, err := utils.ValidateStringField(input.Name, "name", 100)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updColor, err := utils.ValidateStringField(input.Color, "color", 50)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updIcon, err := utils.ValidateStringField(input.Icon, "icon", 100)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updDesc, err := utils.ValidateStringField(input.Description, "description", 500)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tag.Name = updName
	tag.Color = updColor
	tag.Icon = updIcon
	tag.Description = updDesc
	tag.Archived = input.Archived
	if input.GroupID != nil {
		tag.GroupID = input.GroupID
	}

	if err := db.Session(&gorm.Session{NewDB: true}).Save(&tag).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateTag")
		return
	}

	c.JSON(http.StatusOK, tag)
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
	validEntityTypes := map[string]bool{"ticket": true, "contact": true}
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

type createTagInput struct {
	Name        string `json:"name"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	Archived    bool   `json:"archived"`
	GroupID     *int   `json:"groupId"`
}

type updateTagInput struct {
	Name        string `json:"name"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	Archived    bool   `json:"archived"`
	GroupID     *int   `json:"groupId"`
}

func defaultStringTag(v, d string) string {
	if strings.TrimSpace(v) == "" {
		return d
	}
	return v
}

// Ensure render import is used (Writer interface for future JSON responses)
var _ render.Render = nil
