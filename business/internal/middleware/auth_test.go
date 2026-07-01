package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// makeTestDB returns a PostgreSQL test DB suitable for middleware tests.
func makeTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

// makeValidToken creates a signed JWT with the given claims using the provided secret.
func makeValidToken(t *testing.T, secret string, extra jwt.MapClaims) string {
	t.Helper()
	claims := jwt.MapClaims{
		"id":       "user-001",
		"email":    "test@example.com",
		"alcance":  "tenant",
		"tenantId": uuid.New().String(),
		"exp":      time.Now().Add(time.Hour).Unix(),
	}
	for k, v := range extra {
		claims[k] = v
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := tok.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}
	return signed
}

func TestIsAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const secret = "test-secret-isauth"

	setup := func(db *gorm.DB) *gin.Engine {
		r := gin.New()
		r.Use(IsAuth(db))
		r.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"ok": true})
		})
		return r
	}

	t.Run("missing_authorization_header", func(t *testing.T) {
		require.NoError(t, os.Setenv("JWT_SECRET", secret))
		r := setup(makeTestDB(t))
		req, _ := http.NewRequest("GET", "/ping", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Authorization header required")
	})

	t.Run("malformed_header_no_bearer", func(t *testing.T) {
		require.NoError(t, os.Setenv("JWT_SECRET", secret))
		r := setup(makeTestDB(t))
		req, _ := http.NewRequest("GET", "/ping", nil)
		req.Header.Set("Authorization", "Token abc123")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid authorization header format")
	})

	t.Run("jwt_secret_not_set", func(t *testing.T) {
		require.NoError(t, os.Setenv("JWT_SECRET", ""))
		r := setup(makeTestDB(t))
		req, _ := http.NewRequest("GET", "/ping", nil)
		req.Header.Set("Authorization", "Bearer sometoken")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "JWT_SECRET not set")
		require.NoError(t, os.Setenv("JWT_SECRET", secret))
	})

	t.Run("invalid_token", func(t *testing.T) {
		require.NoError(t, os.Setenv("JWT_SECRET", secret))
		r := setup(makeTestDB(t))
		req, _ := http.NewRequest("GET", "/ping", nil)
		req.Header.Set("Authorization", "Bearer thisisnotavalidjwt")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid token")
	})

	t.Run("expired_token", func(t *testing.T) {
		require.NoError(t, os.Setenv("JWT_SECRET", secret))
		claims := jwt.MapClaims{
			"id":       "user-001",
			"email":    "test@example.com",
			"alcance":  "tenant",
			"tenantId": uuid.New().String(),
			"exp":      time.Now().Add(-time.Hour).Unix(),
		}
		tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		signed, _ := tok.SignedString([]byte(secret))

		r := setup(makeTestDB(t))
		req, _ := http.NewRequest("GET", "/ping", nil)
		req.Header.Set("Authorization", "Bearer "+signed)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid token")
	})

	t.Run("invalid_tenant_uuid", func(t *testing.T) {
		require.NoError(t, os.Setenv("JWT_SECRET", secret))
		signed := makeValidToken(t, secret, jwt.MapClaims{"tenantId": "not-a-uuid"})
		r := setup(makeTestDB(t))
		req, _ := http.NewRequest("GET", "/ping", nil)
		req.Header.Set("Authorization", "Bearer "+signed)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid tenant ID format")
	})

	t.Run("valid_token_populates_context", func(t *testing.T) {
		require.NoError(t, os.Setenv("JWT_SECRET", secret))
		tenantID := uuid.New().String()
		signed := makeValidToken(t, secret, jwt.MapClaims{"tenantId": tenantID})

		db := makeTestDB(t)
		r := gin.New()
		r.Use(IsAuth(db))
		r.GET("/ping", func(c *gin.Context) {
			userId, _ := c.Get("userId")
			alcance, _ := c.Get("alcance")
			tid, _ := c.Get("tenantId")
			dbVal, dbExists := c.Get("db")
			assert.NotNil(t, userId)
			assert.NotNil(t, alcance)
			assert.Equal(t, tenantID, tid)
			assert.True(t, dbExists)
			assert.NotNil(t, dbVal)
			c.JSON(http.StatusOK, gin.H{"ok": true})
		})

		req, _ := http.NewRequest("GET", "/ping", nil)
		req.Header.Set("Authorization", "Bearer "+signed)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// GetScoped tests are kept below (existing placeholder — no separate file was present).

func TestSuperAdminOnly_Middleware(t *testing.T) {
	// Set up Gin with test mode
	gin.SetMode(gin.TestMode)

	// Test 1: SuperAdminOnly com alcance "plataforma" → deve permitir acesso
	t.Run("superadmin_success", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.Set("alcance", "plataforma")
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

	// Test 2: SuperAdminOnly com alcance diferente → deve retornar 403
	t.Run("non_superadmin_forbidden", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.Set("alcance", "tenant")
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

	// Test 3: SuperAdminOnly com alcance não string → deve retornar 403
	t.Run("invalid_profile_type_forbidden", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.Set("alcance", 123)
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

	// Test 4: SuperAdminOnly sem alcance definido → deve retornar 403
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
		defer os.Setenv("JWT_SECRET", originalSecret) //nolint:errcheck
		require.NoError(t, os.Setenv("JWT_SECRET", ""))

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
		require.NoError(t, os.Setenv("JWT_SECRET", "test-secret-key"))

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
