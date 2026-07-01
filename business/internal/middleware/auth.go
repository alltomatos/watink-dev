package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// IsAuth retorna middleware que valida JWT e injeta sessão DB tenant-scoped.
func IsAuth(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Server misconfiguration: JWT_SECRET not set"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		tenantID, _ := claims["tenantId"].(string)

		// Validate UUID to prevent SQL injection before string concatenation in SET LOCAL
		if _, err := uuid.Parse(tenantID); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid tenant ID format"})
			c.Abort()
			return
		}

		c.Set("userId", claims["id"])
		c.Set("userEmail", claims["email"])
		c.Set("alcance", claims["alcance"])
		c.Set("tenantId", tenantID)

		tx := db.Session(&gorm.Session{})
		tx.Exec("SET LOCAL app.current_tenant = ?", tenantID)
		c.Set("db", tx)

		c.Next()
	}
}

// SuperAdminOnly returns middleware that restricts access to users
// with Alcance "plataforma" (equivalente ao antigo profile "superadmin").
// Must be used AFTER IsAuth so that alcance is already set in the gin.Context.
func SuperAdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		alcance, _ := c.Get("alcance")
		alcanceStr, ok := alcance.(string)
		if !ok || alcanceStr != "plataforma" {
			c.JSON(http.StatusForbidden, gin.H{"error": "superadmin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}
