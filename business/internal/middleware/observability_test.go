package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestObservabilityMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("passes_request_through_and_returns_200", func(t *testing.T) {
		r := gin.New()
		r.Use(ObservabilityMiddleware())
		r.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

		req, _ := http.NewRequest("GET", "/health", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "ok")
	})

	t.Run("propagates_non_200_status", func(t *testing.T) {
		r := gin.New()
		r.Use(ObservabilityMiddleware())
		r.GET("/not-found", func(c *gin.Context) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		})

		req, _ := http.NewRequest("GET", "/not-found", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("unknown_path_still_logs_without_panic", func(t *testing.T) {
		r := gin.New()
		r.Use(ObservabilityMiddleware())
		// No route registered — gin returns 404 but middleware must not panic
		req, _ := http.NewRequest("GET", "/undefined-path", nil)
		w := httptest.NewRecorder()
		assert.NotPanics(t, func() {
			r.ServeHTTP(w, req)
		})
		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}
