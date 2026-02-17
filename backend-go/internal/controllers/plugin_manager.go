package controllers

import (
	"net/http"
	"strings"

	"github.com/alltomatos/watinkdev/backend-go/internal/plugins"
	"github.com/gin-gonic/gin"
)

type checkoutRequest struct {
	Slug string `json:"slug" binding:"required"`
}

func getTenantID(c *gin.Context) string {
	if v, ok := c.Get("tenantId"); ok {
		switch t := v.(type) {
		case string:
			if t != "" {
				return t
			}
		}
	}
	return c.GetHeader("x-tenant-id")
}

func PluginsCatalog(c *gin.Context) {
	hm := plugins.GetHubManager()
	if hm == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "plugin hub not initialized"})
		return
	}
	c.JSON(http.StatusOK, hm.GetCatalog())
}

func PluginsInstalled(c *gin.Context) {
	hm := plugins.GetHubManager()
	if hm == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "plugin hub not initialized"})
		return
	}

	tenantID := strings.TrimSpace(getTenantID(c))
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantId is required"})
		return
	}

	c.JSON(http.StatusOK, hm.GetInstalled(tenantID))
}

func PluginsCheckout(c *gin.Context) {
	hm := plugins.GetHubManager()
	if hm == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "plugin hub not initialized"})
		return
	}

	var req checkoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	out, status, err := hm.CreateCheckout(req.Slug)
	if err != nil {
		c.JSON(status, gin.H{"error": "hub unavailable"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func PluginsInstance(c *gin.Context) {
	hm := plugins.GetHubManager()
	if hm == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "plugin hub not initialized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"instanceId": hm.GetInstanceID()})
}
