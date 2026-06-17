package controllers

import (
	"errors"
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RoleController encapsulates role/RBAC operations with RLS-scoped DB from auth middleware.
// Retains root DB (rc.db) for global Permission lookups — Permissions are tenant-agnostic.
type RoleController struct {
	db *gorm.DB
}

func NewRoleController(db *gorm.DB) *RoleController {
	return &RoleController{db: db}
}

// @Summary      Listar papéis
// @Tags         rbac
// @Produce      json
// @Success      200  {array}   map[string]interface{}
// @Security     BearerAuth
// @Router       /roles [get]
func (rc *RoleController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Roles")
	if !ok {
		return
	}

	var roles []models.Role
	if err := db.Where("\"tenantId\" = ?", tenantID).Find(&roles).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListRoles")
		return
	}

	c.JSON(http.StatusOK, roles)
}

// @Summary      Detalhar papel
// @Tags         rbac
// @Produce      json
// @Param        roleId  path      int  true  "ID do papel"
// @Success      200     {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /roles/{roleId} [get]
func (rc *RoleController) Show(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Roles")
	if !ok {
		return
	}
	id := c.Param("roleId")

	var role models.Role
	if err := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).
		Preload("Permissions").
		First(&role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Role not found or access denied"})
		} else {
			utils.RespondWithInternalError(c, err, "ShowRole")
		}
		return
	}

	c.JSON(http.StatusOK, role)
}

type createRoleInput struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// @Summary      Criar papel
// @Tags         rbac
// @Accept       json
// @Produce      json
// @Param        body  body      map[string]interface{}  true  "Dados do papel"
// @Success      200   {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /roles [post]
func (rc *RoleController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Roles")
	if !ok {
		return
	}

	var req createRoleInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	role := models.Role{
		Name:        req.Name,
		Description: req.Description,
		TenantID:    tenantID,
	}

	if err := db.Create(&role).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateRole")
		return
	}

	c.JSON(http.StatusOK, role)
}

type updateRoleInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Permissions []int  `json:"permissions"`
}

// @Summary      Atualizar papel
// @Tags         rbac
// @Accept       json
// @Produce      json
// @Param        roleId  path      int                     true  "ID do papel"
// @Param        body    body      map[string]interface{}  true  "Campos a atualizar"
// @Success      200     {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /roles/{roleId} [put]
func (rc *RoleController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Roles")
	if !ok {
		return
	}
	id := c.Param("roleId")

	var req updateRoleInput
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	var role models.Role
	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&role).Error; err != nil {
			return err
		}

		if req.Name != "" {
			role.Name = req.Name
		}
		if req.Description != "" {
			role.Description = req.Description
		}
		if err := tx.Where("\"tenantId\" = ?", tenantID).Save(&role).Error; err != nil {
			return err
		}

		if req.Permissions != nil {
			var permissions []models.Permission
			if err := rc.db.Where("id IN ?", req.Permissions).Find(&permissions).Error; err != nil {
				return err
			}
			if len(permissions) != len(req.Permissions) {
				return gorm.ErrRecordNotFound
			}
			if err := tx.Model(&role).Association("Permissions").Replace(permissions); err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.RespondWithBindError(c, err)
			return
		}
		utils.RespondWithInternalError(c, err, "UpdateRole")
		return
	}

	c.JSON(http.StatusOK, role)
}

// @Summary      Remover papel
// @Tags         rbac
// @Produce      json
// @Param        roleId  path      int  true  "ID do papel"
// @Success      200     {object}  map[string]string
// @Security     BearerAuth
// @Router       /roles/{roleId} [delete]
func (rc *RoleController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Roles")
	if !ok {
		return
	}
	id := c.Param("roleId")

	result := db.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.Role{})
	if result.Error != nil {
		utils.RespondWithInternalError(c, result.Error, "DeleteRole")
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found or access denied"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role deleted successfully"})
}

// FindRoleByID returns a role scoped to the given tenant.
// Used by other controllers (e.g. GroupController) for cross-verification.
func FindRoleByID(db *gorm.DB, roleID int, tenantID uuid.UUID) (*models.Role, error) {
	var role models.Role
	if err := db.Where("id = ? AND \"tenantId\" = ?", roleID, tenantID).First(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}
