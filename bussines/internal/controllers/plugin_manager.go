package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/alltomatos/watinkdev/bussines/internal/plugins"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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

	if tenantID := strings.TrimSpace(c.GetHeader("x-tenant-id")); tenantID != "" {
		return tenantID
	}

	authHeader := c.GetHeader("Authorization")
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_secret"
	}

	token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return ""
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return ""
	}

	tenantID, _ := claims["tenantId"].(string)
	return strings.TrimSpace(tenantID)
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
		c.JSON(http.StatusOK, gin.H{"active": []string{}, "statuses": map[string]string{}})
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
