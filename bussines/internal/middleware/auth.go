package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

func IsAuth() gin.HandlerFunc {
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
			secret = "default_secret"
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

		tenantID := claims["tenantId"].(string)

		// Set user info in context
		c.Set("userId", claims["id"])
		c.Set("userEmail", claims["email"])
		c.Set("userProfile", claims["profile"])
		c.Set("tenantId", tenantID)

		// ✅ CORE UPGRADE: RLS-Aware Session
		// We create a scoped database session for this request
		// This session will have the tenant ID set for all its queries
		tx := database.DB.Session(&gorm.Session{})
		tx.Exec(fmt.Sprintf("SET app.current_tenant = '%s'", tenantID))
		c.Set("db", tx)

		c.Next()
	}
}
