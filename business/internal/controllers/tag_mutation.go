package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

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
