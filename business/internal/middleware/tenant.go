package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// TenantMiddleware validates that the authenticated user's tenant context
// is properly set. The tenantId MUST come exclusively from the JWT token
// (set by IsAuth middleware). This middleware REJECTS any x-tenant-id
// header to prevent Tenant Impersonation attacks.
//
// Chain order: IsAuth → TenantMiddleware → (handlers)
func TenantMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// SECURITY: Reject x-tenant-id header — the ONLY source of truth
		// for tenant identity is the JWT token, set by IsAuth middleware.
		// Allowing client-supplied headers enables cross-tenant impersonation.
		if c.GetHeader("x-tenant-id") != "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "x-tenant-id header is not accepted; tenant identity is derived from the JWT token",
			})
			c.Abort()
			return
		}

		// Verify that IsAuth has already set the tenantId from the JWT.
		// If missing, the request is unauthenticated or middleware order is wrong.
		if _, exists := c.Get("tenantId"); !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "tenant context not found — ensure IsAuth middleware runs before TenantMiddleware",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
