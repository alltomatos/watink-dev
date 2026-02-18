package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func extractToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return parts[1]
		}
	}
	return c.Query("token")
}

func parseUserFromToken(tokenString string) (int, string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_secret"
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return 0, "", fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, "", fmt.Errorf("invalid token claims")
	}

	profile, _ := claims["profile"].(string)
	userID := 0
	switch v := claims["id"].(type) {
	case float64:
		userID = int(v)
	case int:
		userID = v
	case string:
		parsed, _ := strconv.Atoi(v)
		userID = parsed
	}

	return userID, strings.ToLower(profile), nil
}

func hasSwaggerGroupPermission(userID int) bool {
	if userID <= 0 {
		return false
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil || user.GroupID == nil {
		return false
	}

	var count int64
	database.DB.Table("GroupPermissions gp").
		Joins("JOIN \"Permissions\" p ON p.id = gp.\"permissionId\"").
		Where("gp.\"groupId\" = ? AND ((p.resource = ? AND p.action = ?) OR (p.resource = ? AND p.action = ?))", *user.GroupID, "view", "swagger", "view_swagger", "allow").
		Count(&count)

	return count > 0
}

func ensureSwaggerAccess(c *gin.Context) bool {
	token := extractToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization required"})
		return false
	}

	userID, profile, err := parseUserFromToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return false
	}

	if profile == "superadmin" || hasSwaggerGroupPermission(userID) {
		return true
	}

	c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
	return false
}

func SwaggerUI(c *gin.Context) {
	if !ensureSwaggerAccess(c) {
		return
	}

	html := `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Watink API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; }
      #swagger-ui { max-width: 1200px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      const token = new URLSearchParams(window.location.search).get('token') || '';
      window.ui = SwaggerUIBundle({
        url: '/api/swagger.json?token=' + encodeURIComponent(token),
        dom_id: '#swagger-ui',
        deepLinking: true,
        displayRequestDuration: true,
      });
    </script>
  </body>
</html>`

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}

func SwaggerJSON(c *gin.Context) {
	if !ensureSwaggerAccess(c) {
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"openapi": "3.0.3",
		"info": gin.H{
			"title":       "Watink Business API",
			"version":     "2.0.0",
			"description": "Documentação da API do backend Go (binário único).",
		},
		"servers": []gin.H{{"url": "/"}},
		"paths": gin.H{
			"/api/auth/login":                                gin.H{"post": gin.H{"summary": "Login", "responses": gin.H{"200": gin.H{"description": "OK"}}, "security": []gin.H{}, "tags": []string{"auth"}}},
			"/api/health":                                    gin.H{"get": gin.H{"summary": "Health check", "responses": gin.H{"200": gin.H{"description": "OK"}}, "security": []gin.H{}, "tags": []string{"system"}}},
			"/api/public-settings":                           gin.H{"get": gin.H{"summary": "Lista configurações públicas", "responses": gin.H{"200": gin.H{"description": "OK"}}, "security": []gin.H{}, "tags": []string{"settings"}}},
			"/api/tickets":                                   gin.H{"get": gin.H{"summary": "Lista tickets", "responses": gin.H{"200": gin.H{"description": "OK"}, "401": gin.H{"description": "Unauthorized"}}, "tags": []string{"tickets"}}},
			"/api/pipelines":                                 gin.H{"get": gin.H{"summary": "Lista pipelines", "tags": []string{"pipelines"}}, "post": gin.H{"summary": "Cria pipeline", "tags": []string{"pipelines"}}},
			"/api/pipelines/{pipelineId}":                    gin.H{"put": gin.H{"summary": "Atualiza pipeline", "tags": []string{"pipelines"}}},
			"/api/pipelines/import":                          gin.H{"post": gin.H{"summary": "Importa pipeline", "tags": []string{"pipelines"}}},
			"/api/pipelines/export/{pipelineId}":             gin.H{"get": gin.H{"summary": "Exporta pipeline", "tags": []string{"pipelines"}}},
			"/api/pipelines/ai-suggest":                      gin.H{"post": gin.H{"summary": "Sugestão IA de pipeline", "tags": []string{"pipelines"}}},
			"/api/knowledge-bases":                           gin.H{"get": gin.H{"summary": "Lista bases de conhecimento", "tags": []string{"knowledge-base"}}, "post": gin.H{"summary": "Cria base de conhecimento", "tags": []string{"knowledge-base"}}},
			"/api/knowledge-bases/{knowledgeBaseId}":         gin.H{"get": gin.H{"summary": "Detalha base de conhecimento", "tags": []string{"knowledge-base"}}, "put": gin.H{"summary": "Atualiza base de conhecimento", "tags": []string{"knowledge-base"}}, "delete": gin.H{"summary": "Remove base de conhecimento", "tags": []string{"knowledge-base"}}},
			"/api/knowledge-bases/{knowledgeBaseId}/sources": gin.H{"post": gin.H{"summary": "Adiciona fonte na base", "tags": []string{"knowledge-base"}}},
			"/api/knowledge-bases/{knowledgeBaseId}/sources/{sourceId}": gin.H{"delete": gin.H{"summary": "Remove fonte da base", "tags": []string{"knowledge-base"}}},
		},
		"components": gin.H{"securitySchemes": gin.H{"bearerAuth": gin.H{"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}}},
		"security":   []gin.H{{"bearerAuth": []string{}}},
	})
}
