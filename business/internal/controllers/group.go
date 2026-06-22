package controllers

import (
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GroupController encapsulates group/RBAC operations.
// permRepo: global (tenant-agnostic) permission catalog — not RLS-scoped.
// All Group mutations use auth.GetScoped for RLS isolation.
type GroupController struct {
	permRepo domain.PermissionRepository
}

func NewGroupController(permRepo domain.PermissionRepository) *GroupController {
	return &GroupController{permRepo: permRepo}
}

// @Summary      Listar grupos
// @Tags         rbac
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /groups [get]
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
// @Summary      Listar permissões disponíveis
// @Tags         rbac
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /permissions [get]
func (gc *GroupController) ListPermissions(c *gin.Context) {
	permissions, err := gc.permRepo.FindAll(c.Request.Context())
	if err != nil {
		utils.RespondWithInternalError(c, err, "ListPermissions")
		return
	}
	c.JSON(200, permissions)
}

// @Summary      Detalhar grupo
// @Tags         rbac
// @Produce      json
// @Param        groupId  path      int  true  "ID do grupo"
// @Success      200      {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /groups/{groupId} [get]
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

// @Summary      Criar grupo
// @Tags         rbac
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados do grupo"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /groups [post]
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

	groupName, err := utils.ValidateStringField(req.Name, "name", 100)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	group := models.Group{
		Name:     groupName,
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

// @Summary      Atualizar grupo
// @Tags         rbac
// @Accept       json
// @Produce      json
// @Param        groupId  path      int                     true  "ID do grupo"
// @Param        body     body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200      {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /groups/{groupId} [put]
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
			updName, err := utils.ValidateStringField(req.Name, "name", 100)
			if err != nil {
				return err
			}
			group.Name = updName
		}
		if err := tx.Where("\"tenantId\" = ?", tenantID).Save(&group).Error; err != nil {
			return err
		}

		if req.Permissions != nil {
			permissions, err := gc.permRepo.FindByIDs(tx.Statement.Context, req.Permissions)
			if err != nil {
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
			if err := tx.Session(&gorm.Session{NewDB: true}).Model(&group).Association("Roles").Replace(roles); err != nil {
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

// @Summary      Remover grupo
// @Tags         rbac
// @Produce      json
// @Param        groupId  path      int  true  "ID do grupo"
// @Success      200      {object}  map[string]string
// @Security     BearerAuth
// @Router       /groups/{groupId} [delete]
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
