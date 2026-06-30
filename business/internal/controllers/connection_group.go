package controllers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
)

// ConnectionGroupController manages groupings of WhatsApp connections.
// Tenant-scoped via auth.GetScoped (reusing the "Whatsapps" permission).
type ConnectionGroupController struct{}

func NewConnectionGroupController() *ConnectionGroupController { return &ConnectionGroupController{} }

type connectionGroupInput struct {
	Name string `json:"name"`
}

// List returns the tenant's connection groups with their member counts.
// @Summary      Listar grupos de conexões
// @Tags         connection-groups
// @Produce      json
// @Success      200  {array}  map[string]interface{}
// @Security     BearerAuth
// @Router       /connection-groups [get]
func (cgc *ConnectionGroupController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	var groups []models.ConnectionGroup
	if err := db.Where(`"tenantId" = ?`, tenantID).Order("id DESC").Find(&groups).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListConnectionGroups")
		return
	}

	type countRow struct {
		ConnectionGroupID int
		Total             int64
	}
	var counts []countRow
	db.Model(&models.Whatsapp{}).
		Select(`"connectionGroupId" as connection_group_id, COUNT(*) as total`).
		Where(`"tenantId" = ? AND "connectionGroupId" IS NOT NULL`, tenantID).
		Group(`"connectionGroupId"`).
		Scan(&counts)
	byGroup := make(map[int]int64, len(counts))
	for _, r := range counts {
		byGroup[r.ConnectionGroupID] = r.Total
	}

	resp := make([]gin.H, len(groups))
	for i, g := range groups {
		resp[i] = gin.H{
			"id": g.ID, "name": g.Name, "tenantId": g.TenantID,
			"createdAt": g.CreatedAt, "updatedAt": g.UpdatedAt,
			"connectionCount": byGroup[g.ID],
		}
	}
	c.JSON(http.StatusOK, resp)
}

// Create inserts a connection group.
// @Summary      Criar grupo de conexões
// @Tags         connection-groups
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /connection-groups [post]
func (cgc *ConnectionGroupController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	var in connectionGroupInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	if _, err := utils.ValidateStringField(in.Name, "name", 120); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name é obrigatório"})
		return
	}
	g := models.ConnectionGroup{TenantID: tenantID, Name: in.Name}
	if err := db.Create(&g).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateConnectionGroup")
		return
	}
	c.JSON(http.StatusOK, g)
}

// Update renames a connection group.
// @Summary      Atualizar grupo de conexões
// @Tags         connection-groups
// @Accept       json
// @Produce      json
// @Param        id  path  int  true  "ID do grupo"
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /connection-groups/{id} [put]
func (cgc *ConnectionGroupController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))
	var g models.ConnectionGroup
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&g).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "grupo não encontrado"})
		return
	}
	var in connectionGroupInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name é obrigatório"})
		return
	}
	if _, err := utils.ValidateStringField(in.Name, "name", 120); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.Model(&models.ConnectionGroup{}).Where(`id = ? AND "tenantId" = ?`, id, tenantID).Update("name", in.Name).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateConnectionGroup")
		return
	}
	_ = db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&g).Error
	c.JSON(http.StatusOK, g)
}

// Delete removes a connection group, detaching its connections.
// @Summary      Remover grupo de conexões
// @Tags         connection-groups
// @Produce      json
// @Param        id  path  int  true  "ID do grupo"
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /connection-groups/{id} [delete]
func (cgc *ConnectionGroupController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))
	if err := db.Model(&models.Whatsapp{}).
		Where(`"connectionGroupId" = ? AND "tenantId" = ?`, id, tenantID).
		Update("connectionGroupId", nil).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DetachConnectionsFromGroup")
		return
	}
	res := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).Delete(&models.ConnectionGroup{})
	if res.Error != nil {
		utils.RespondWithInternalError(c, res.Error, "DeleteConnectionGroup")
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "grupo não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Grupo removido"})
}
