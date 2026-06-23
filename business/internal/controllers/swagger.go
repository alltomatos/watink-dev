package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type SwaggerController struct {
	permRepo domain.SwaggerPermissionRepository
}

func NewSwaggerController(permRepo domain.SwaggerPermissionRepository) *SwaggerController {
	return &SwaggerController{permRepo: permRepo}
}

// extractToken lê Bearer token do header Authorization ou query param ?token.
// Função pura — sem acesso a DB ou estado global.
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

// parseUserFromToken valida JWT e extrai userID, profile, tenantID.
// Função pura — sem acesso a DB ou estado global.
func parseUserFromToken(tokenString string) (int, string, string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return 0, "", "", fmt.Errorf("JWT_SECRET must be set — security-critical")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return 0, "", "", fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, "", "", fmt.Errorf("invalid token claims")
	}

	profile, _ := claims["profile"].(string)
	tenantID, _ := claims["tenantId"].(string)
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

	return userID, strings.ToLower(profile), tenantID, nil
}

func (sc *SwaggerController) hasSwaggerGroupPermission(userID int, tenantID string) bool {
	if userID <= 0 || tenantID == "" {
		return false
	}
	parsedTenantID, err := uuid.Parse(tenantID)
	if err != nil {
		return false
	}
	ok, _ := sc.permRepo.HasSwaggerPermission(userID, parsedTenantID)
	return ok
}

// ensureSwaggerAccess valida token e verifica permissão swagger.
// Quando DOCS_PUBLIC=true (dev), libera sem autenticação.
// Retorna true se acesso concedido; envia HTTP error e retorna false caso contrário.
func (sc *SwaggerController) ensureSwaggerAccess(c *gin.Context) bool {
	if os.Getenv("DOCS_PUBLIC") == "true" {
		return true
	}

	token := extractToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization required"})
		return false
	}

	userID, profile, tenantID, err := parseUserFromToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return false
	}

	if profile == "superadmin" || sc.hasSwaggerGroupPermission(userID, tenantID) {
		return true
	}

	c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
	return false
}

func (sc *SwaggerController) SwaggerUI(c *gin.Context) {
	if !sc.ensureSwaggerAccess(c) {
		return
	}

	html := `<!doctype html>
<html>
 <head>
 <meta charset="utf-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1" />
 <title>Watink API Docs</title>
 </head>
 <body>
 <script id="api-reference" data-url="/api/v1/swagger.json?token=" type="application/json"></script>
 <script>
 const token = new URLSearchParams(window.location.search).get('token') || '';
 document.getElementById('api-reference').dataset.url = '/api/v1/swagger.json?token=' + encodeURIComponent(token);
 </script>
 <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
 </body>
</html>`

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}

func (sc *SwaggerController) SwaggerJSON(c *gin.Context) {
	if !sc.ensureSwaggerAccess(c) {
		return
	}
	c.File("docs/swagger.json")
}
