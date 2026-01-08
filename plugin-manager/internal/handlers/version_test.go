package handlers

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestVersionEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.Default()
	router.GET("/version", func(c *gin.Context) {
		version := "0.0.0"
		data, err := os.ReadFile("VERSION")
		if err == nil {
			version = string(data)
		}
		lastUpdated := os.Getenv("BUILD_TIMESTAMP")
		if lastUpdated == "" {
			lastUpdated = "test"
		}
		c.Header("Cache-Control", "no-store")
		c.JSON(http.StatusOK, gin.H{
			"service":     "plugin-manager",
			"version":     version,
			"lastUpdated": lastUpdated,
		})
	})

	req := httptest.NewRequest(http.MethodGet, "/version", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

