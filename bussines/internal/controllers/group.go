package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/gin-gonic/gin"
)

func ListGroups(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var groups []models.Group
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch groups"})
		return
	}

	c.JSON(http.StatusOK, groups)
}

func ListPermissions(c *gin.Context) {
	var permissions []models.Permission
	if err := database.DB.Find(&permissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch permissions"})
		return
	}

	c.JSON(http.StatusOK, permissions)
}

func ShowGroup(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("groupId")

	var group models.Group
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		Preload("Permissions").
		Preload("Roles").
		First(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	c.JSON(http.StatusOK, group)
}

func CreateGroup(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	var group models.Group
	if err := c.ShouldBindJSON(&group); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group.TenantID = tenantID
	if err := database.DB.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
		return
	}

	c.JSON(http.StatusOK, group)
}

func UpdateGroup(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("groupId")

	var group models.Group
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	var req struct {
		Name        string `json:"name"`
		Permissions []int  `json:"permissions"`
		Roles       []int  `json:"roles"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group.Name = req.Name
	database.DB.Save(&group)

	if req.Permissions != nil {
		var permissions []models.Permission
		database.DB.Where("id IN ?", req.Permissions).Find(&permissions)
		database.DB.Model(&group).Association("Permissions").Replace(permissions)
	}

	if req.Roles != nil {
		var roles []models.Role
		database.DB.Where("id IN ?", req.Roles).Find(&roles)
		database.DB.Model(&group).Association("Roles").Replace(roles)
	}

	c.JSON(http.StatusOK, group)
}

func DeleteGroup(c *gin.Context) {
	tenantID, err := tenantUUIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}
	id := c.Param("groupId")

	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.Group{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group deleted successfully"})
}
