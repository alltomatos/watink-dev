package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/gin-gonic/gin"
)

func ListTags(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	includeArchived := c.Query("includeArchived") == "true"
	var tags []models.Tag
	q := database.DB.Where("\"tenantId\" = ?", tenantID).Preload("Group")
	if !includeArchived {
		q = q.Where("archived = ?", false)
	}

	if err := q.Order("name ASC").Find(&tags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
		return
	}

	result := make([]gin.H, 0, len(tags))
	for _, t := range tags {
		var usage int64
		database.DB.Model(&models.EntityTag{}).Where("\"tenantId\" = ? AND \"tagId\" = ?", tenantID, t.ID).Count(&usage)
		result = append(result, gin.H{
			"id": t.ID, "name": t.Name, "color": t.Color, "icon": t.Icon,
			"description": t.Description, "archived": t.Archived, "groupId": t.GroupID,
			"tenantId": t.TenantID, "group": t.Group, "usageCount": usage,
		})
	}

	c.JSON(http.StatusOK, result)
}

func CreateTag(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	name := strings.TrimSpace(toString(payload["name"]))
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	input := models.Tag{
		Name:        name,
		Color:       defaultString(strings.TrimSpace(toString(payload["color"])), "blue"),
		Icon:        strings.TrimSpace(toString(payload["icon"])),
		Description: strings.TrimSpace(toString(payload["description"])),
		Archived:    toBool(payload["archived"]),
		TenantID:    tenantID,
	}
	if gid := toOptionalInt(payload["groupId"]); gid != nil {
		input.GroupID = gid
	}

	if err := database.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, input)
}

func UpdateTag(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("id")

	var tag models.Tag
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&tag).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}

	var input models.Tag
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.ID = tag.ID
	input.TenantID = tenantID
	if err := database.DB.Model(&tag).Updates(input).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tag)
}

func DeleteTag(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("id")
	forceDelete := c.Query("forceDelete") == "true"

	var tag models.Tag
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&tag).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}

	if forceDelete {
		database.DB.Where("\"tenantId\" = ? AND \"tagId\" = ?", tenantID, tag.ID).Delete(&models.EntityTag{})
		if err := database.DB.Delete(&tag).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Tag deleted"})
		return
	}

	if err := database.DB.Model(&tag).Update("archived", true).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag archived"})
}

func ListTagGroups(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	var groups []models.TagGroup
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Order("name ASC").Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tag groups"})
		return
	}
	c.JSON(http.StatusOK, groups)
}

func SyncEntityTags(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	entityType := c.Param("entityType")
	id, _ := strconv.Atoi(c.Param("id"))

	var payload struct {
		TagIDs []int `json:"tagIds"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Where("\"tenantId\" = ? AND \"entityType\" = ? AND \"entityId\" = ?", tenantID, entityType, id).Delete(&models.EntityTag{})
	for _, tagID := range payload.TagIDs {
		database.DB.Create(&models.EntityTag{TagID: tagID, EntityType: entityType, EntityID: id, TenantID: tenantID})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tags synced"})
}

func toString(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	default:
		return ""
	}
}

func defaultString(v, d string) string {
	if strings.TrimSpace(v) == "" {
		return d
	}
	return v
}

func toBool(v interface{}) bool {
	switch t := v.(type) {
	case bool:
		return t
	case string:
		return strings.EqualFold(t, "true") || t == "1"
	default:
		return false
	}
}

func toOptionalInt(v interface{}) *int {
	switch t := v.(type) {
	case float64:
		i := int(t)
		return &i
	case int:
		i := t
		return &i
	case string:
		t = strings.TrimSpace(t)
		if t == "" {
			return nil
		}
		i, err := strconv.Atoi(t)
		if err != nil {
			return nil
		}
		return &i
	default:
		return nil
	}
}
