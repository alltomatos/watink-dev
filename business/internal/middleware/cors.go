package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Vary on Origin so a no-Origin response (e.g. an <img>/<video> load) is not
		// cached and then reused for a credentialed XHR to the same URL.
		c.Writer.Header().Add("Vary", "Origin")

		// Only emit the credentialed CORS headers when there is an Origin to echo.
		// Setting an empty Access-Control-Allow-Origin together with
		// Allow-Credentials: true is invalid and breaks media fetched via XHR.
		if origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-tenant-id")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
