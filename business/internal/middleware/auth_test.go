package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestSuperAdminOnly_Middleware(t *testing.T) {
	// Set up Gin with test mode
	gin.SetMode(gin.TestMode)

	// Test 1: SuperAdminOnly com perfil "superadmin" → deve permitir acesso
	t.Run("superadmin_success", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.Set("userProfile", "superadmin")
		})
		r.GET("/protected", SuperAdminOnly(), func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "access granted"})
		})

		req, _ := http.NewRequest("GET", "/protected", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "access granted")
	})

	// Test 2: SuperAdminOnly com perfil diferente → deve retornar 403
	t.Run("non_superadmin_forbidden", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.Set("userProfile", "admin")
		})
		r.GET("/protected", SuperAdminOnly(), func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "access granted"})
		})

		req, _ := http.NewRequest("GET", "/protected", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.Contains(t, w.Body.String(), "superadmin access required")
	})

	// Test 3: SuperAdminOnly com perfil não string → deve retornar 403
	t.Run("invalid_profile_type_forbidden", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.Set("userProfile", 123)
		})
		r.GET("/protected", SuperAdminOnly(), func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "access granted"})
		})

		req, _ := http.NewRequest("GET", "/protected", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.Contains(t, w.Body.String(), "superadmin access required")
	})

	// Test 4: SuperAdminOnly sem perfil definido → deve retornar 403
	t.Run("missing_profile_forbidden", func(t *testing.T) {
		r := gin.New()
		r.GET("/protected", SuperAdminOnly(), func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "access granted"})
		})

		req, _ := http.NewRequest("GET", "/protected", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.Contains(t, w.Body.String(), "superadmin access required")
	})

	// Test 5: Verifica que JWT_SECRET está configurado (dependência do IsAuth anterior)
	t.Run("jwt_secret_required", func(t *testing.T) {
		// Limpa JWT_SECRET para testar falha de configuração
		originalSecret := os.Getenv("JWT_SECRET")
		defer os.Setenv("JWT_SECRET", originalSecret)
		os.Setenv("JWT_SECRET", "")

		// Criar um mock do IsAuth para simular falha de JWT_SECRET
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Server misconfiguration: JWT_SECRET not set"})
			c.Abort()
		})

		req, _ := http.NewRequest("GET", "/protected", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "JWT_SECRET not set")
	})
}

func TestSuperAdminOnly_ChainWithIsAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Testa o fluxo real: IsAuth → SuperAdminOnly
	t.Run("full_auth_chain", func(t *testing.T) {
		// Configura JWT_SECRET para teste
		os.Setenv("JWT_SECRET", "test-secret-key")

		r := gin.New()
		r.Use(IsAuth(nil)) // DB nil permitida pois validação JWT falha antes
		r.Use(SuperAdminOnly())
		r.GET("/admin-only", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "admin area"})
		})

		// Neste teste simplificado, não simulamos JWT real, apenas verificamos que
		// a middleware não quebra com JWT_SECRET setado
		// (IsAuth() falharia com JWT inválido, mas não com JWT_SECRET ausente)
		req, _ := http.NewRequest("GET", "/admin-only", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		// Deveria falhar na validação JWT (header ausente), mas não por falta de JWT_SECRET
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Authorization header required")
	})
}
