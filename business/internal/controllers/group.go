package controllers

import (
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GroupController encapsulates group/RBAC operations with RLS-scoped DB from auth middleware.
// Retains root DB (gc.db) for global Permission lookups — Permissions are tenant-agnostic.
type GroupController struct {
	db *gorm.DB
}

func NewGroupController(db *gorm.DB) *GroupController {
	return &GroupController{db: db}
}

func (gc *GroupController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Groups")
	if !ok {
		return
	}

	var groups []models.Group
	if err := db.Where("\"tenantId\" = ?", tenantID).Find(&groups).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListGroups")
		return
	}

	c.JSON(200, groups)
}

// ListPermissions returns global permissions catalog.
// Uses gc.db (root DB) because Permissions are NOT tenant-scoped —
// auth.GetScoped(c, "Groups") would apply RLS and produce zero results for non-superadmins.
func (gc *GroupController) ListPermissions(c *gin.Context) {
	var permissions []models.Permission
	if err := gc.db.Find(&permissions).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListPermissions")
		return
	}
	c.JSON(200, permissions)
}

func (gc *GroupController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Groups")
	if !ok {
		return
	}
	id := c.Param("groupId")

	var group models.Group
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		Preload("Permissions").
		Preload("Roles").
		First(&group).Error; err != nil {
		c.JSON(404, gin.H{"error": "Group not found"})
		return
	}

	c.JSON(200, group)
}

type createGroupInput struct {
	Name string `json:"name" binding:"required"`
}

func (gc *GroupController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Groups")
	if !ok {
		return
	}

	var req createGroupInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	group := models.Group{
		Name:     req.Name,
		TenantID: tenantID,
	}

	if err := db.Create(&group).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateGroup")
		return
	}

	c.JSON(200, group)
}

type updateGroupInput struct {
	Name        string `json:"name"`
	Permissions []int  `json:"permissions"`
	Roles       []int  `json:"roles"`
}

func (gc *GroupController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Groups")
	if !ok {
		return
	}
	id := c.Param("groupId")

	var req updateGroupInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	var group models.Group
	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&group).Error; err != nil {
			return err
		}

		if req.Name != "" {
			group.Name = req.Name
		}
		if err := tx.Where("\"tenantId\" = ?", tenantID).Save(&group).Error; err != nil {
			return err
		}

		if req.Permissions != nil {
			var permissions []models.Permission
			if err := gc.db.Where("id IN ?", req.Permissions).Find(&permissions).Error; err != nil {
				return err
			}
			if len(permissions) != len(req.Permissions) {
				return gorm.ErrRecordNotFound
			}
			if err := tx.Model(&group).Association("Permissions").Replace(permissions); err != nil {
				return err
			}
		}

		if req.Roles != nil {
			var roles []models.Role
			if err := tx.Where("id IN ? AND \"tenantId\" = ?", req.Roles, tenantID).Find(&roles).Error; err != nil {
				return err
			}
			if len(roles) != len(req.Roles) {
				return gorm.ErrRecordNotFound
			}
			if err := tx.Model(&group).Association("Roles").Replace(roles); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(400, gin.H{"error": "Invalid group, role or permission for this tenant"})
			return
		}
		utils.RespondWithInternalError(c, err, "UpdateGroup")
		return
	}

	c.JSON(200, group)
}

func (gc *GroupController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Groups")
	if !ok {
		return
	}
	id := c.Param("groupId")

	result := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.Group{})
	if result.Error != nil {
		utils.RespondWithInternalError(c, result.Error, "DeleteGroup")
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(404, gin.H{"error": "Group not found"})
		return
	}

	c.JSON(200, gin.H{"message": "Group deleted successfully"})
}
