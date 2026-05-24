package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TenantMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantIDStr := c.GetHeader("x-tenant-id")
		if tenantIDStr == "" {
			// For public routes, we might allow no tenantID
			// But for protected routes, it's required
			c.Next()
			return
		}

		tenantID, err := uuid.Parse(tenantIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
			c.Abort()
			return
		}

		c.Set("tenantId", tenantID)
		c.Next()
	}
}
