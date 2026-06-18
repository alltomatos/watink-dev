package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestCORSMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	newRouter := func() *gin.Engine {
		r := gin.New()
		r.Use(CORSMiddleware())
		r.GET("/resource", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"ok": true})
		})
		return r
	}

	t.Run("options_returns_204_with_cors_headers", func(t *testing.T) {
		r := newRouter()
		req, _ := http.NewRequest("OPTIONS", "/resource", nil)
		req.Header.Set("Origin", "https://app.example.com")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNoContent, w.Code)
		assert.Equal(t, "https://app.example.com", w.Header().Get("Access-Control-Allow-Origin"))
		assert.Equal(t, "true", w.Header().Get("Access-Control-Allow-Credentials"))
		assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "POST")
		assert.Contains(t, w.Header().Get("Access-Control-Allow-Headers"), "Authorization")
	})

	t.Run("get_request_passes_through_with_cors_headers", func(t *testing.T) {
		r := newRouter()
		req, _ := http.NewRequest("GET", "/resource", nil)
		req.Header.Set("Origin", "https://app.example.com")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "https://app.example.com", w.Header().Get("Access-Control-Allow-Origin"))
		assert.Contains(t, w.Body.String(), "ok")
	})

	t.Run("no_origin_header_still_sets_empty_allow_origin", func(t *testing.T) {
		r := newRouter()
		req, _ := http.NewRequest("GET", "/resource", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		// When Origin is absent the header is set to the empty string — not an error
		assert.Equal(t, "", w.Header().Get("Access-Control-Allow-Origin"))
	})
}
