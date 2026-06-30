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

// ProxyGroupController manages proxy pools (groups) and their rotation strategy.
// Tenant-scoped via auth.GetScoped (reusing the "Whatsapps" permission).
type ProxyGroupController struct{}

func NewProxyGroupController() *ProxyGroupController { return &ProxyGroupController{} }

var allowedRotation = map[string]bool{"sticky": true, "rotate": true}

func normalizeRotation(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" {
		return "sticky"
	}
	return s
}

type proxyGroupInput struct {
	Name             string `json:"name"`
	RotationStrategy string `json:"rotationStrategy"`
}

// List returns the tenant's proxy groups with their active-proxy counts.
// @Summary      Listar grupos de proxy
// @Tags         proxy-groups
// @Produce      json
// @Success      200  {array}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxy-groups [get]
func (pgc *ProxyGroupController) List(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	var groups []models.ProxyGroup
	if err := db.Where(`"tenantId" = ?`, tenantID).Order("id DESC").Find(&groups).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListProxyGroups")
		return
	}

	// Active-proxy count per group (one grouped query, tenant-scoped).
	type countRow struct {
		ProxyGroupID int
		Total        int64
		Active       int64
	}
	var counts []countRow
	db.Model(&models.Proxy{}).
		Select(`"proxyGroupId" as proxy_group_id, COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active`).
		Where(`"tenantId" = ? AND "proxyGroupId" IS NOT NULL`, tenantID).
		Group(`"proxyGroupId"`).
		Scan(&counts)
	totalByGroup := make(map[int]int64, len(counts))
	activeByGroup := make(map[int]int64, len(counts))
	for _, r := range counts {
		totalByGroup[r.ProxyGroupID] = r.Total
		activeByGroup[r.ProxyGroupID] = r.Active
	}

	resp := make([]gin.H, len(groups))
	for i, g := range groups {
		resp[i] = gin.H{
			"id": g.ID, "name": g.Name, "rotationStrategy": g.RotationStrategy,
			"tenantId": g.TenantID, "createdAt": g.CreatedAt, "updatedAt": g.UpdatedAt,
			"proxyCount": totalByGroup[g.ID], "activeProxyCount": activeByGroup[g.ID],
		}
	}
	c.JSON(http.StatusOK, resp)
}

// Create inserts a proxy group.
// @Summary      Criar grupo de proxy
// @Tags         proxy-groups
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxy-groups [post]
func (pgc *ProxyGroupController) Create(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	var in proxyGroupInput
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
	rotation := normalizeRotation(in.RotationStrategy)
	if !allowedRotation[rotation] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rotationStrategy inválido: use 'sticky' ou 'rotate'"})
		return
	}
	g := models.ProxyGroup{TenantID: tenantID, Name: in.Name, RotationStrategy: rotation}
	if err := db.Create(&g).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateProxyGroup")
		return
	}
	c.JSON(http.StatusOK, g)
}

// Update edits a proxy group.
// @Summary      Atualizar grupo de proxy
// @Tags         proxy-groups
// @Accept       json
// @Produce      json
// @Param        id  path  int  true  "ID do grupo"
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /proxy-groups/{id} [put]
func (pgc *ProxyGroupController) Update(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))
	var g models.ProxyGroup
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&g).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "grupo não encontrado"})
		return
	}
	var in proxyGroupInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}
	fields := map[string]interface{}{}
	if strings.TrimSpace(in.Name) != "" {
		if _, err := utils.ValidateStringField(in.Name, "name", 120); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		fields["name"] = in.Name
	}
	if in.RotationStrategy != "" {
		rotation := normalizeRotation(in.RotationStrategy)
		if !allowedRotation[rotation] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "rotationStrategy inválido"})
			return
		}
		fields["rotationStrategy"] = rotation
	}
	if err := db.Model(&models.ProxyGroup{}).Where(`id = ? AND "tenantId" = ?`, id, tenantID).Updates(fields).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateProxyGroup")
		return
	}
	_ = db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&g).Error
	c.JSON(http.StatusOK, g)
}

// Delete removes a group, detaching its proxies and any connections using it.
// @Summary      Remover grupo de proxy
// @Tags         proxy-groups
// @Produce      json
// @Param        id  path  int  true  "ID do grupo"
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /proxy-groups/{id} [delete]
func (pgc *ProxyGroupController) Delete(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Whatsapps")
	if !ok {
		return
	}
	id, _ := strconv.Atoi(c.Param("id"))

	// Detach proxies from the group.
	if err := db.Model(&models.Proxy{}).
		Where(`"proxyGroupId" = ? AND "tenantId" = ?`, id, tenantID).
		Update("proxyGroupId", nil).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DetachProxiesFromGroup")
		return
	}
	// Detach connections pointing at the group (fall back to no proxy).
	if err := db.Model(&models.Whatsapp{}).
		Where(`"proxyGroupId" = ? AND "tenantId" = ?`, id, tenantID).
		Updates(map[string]interface{}{"proxyGroupId": nil, "proxyMode": "none", "proxyId": nil}).Error; err != nil {
		utils.RespondWithInternalError(c, err, "DetachConnectionsFromGroup")
		return
	}
	res := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).Delete(&models.ProxyGroup{})
	if res.Error != nil {
		utils.RespondWithInternalError(c, res.Error, "DeleteProxyGroup")
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "grupo não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Grupo removido"})
}
