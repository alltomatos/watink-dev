package utils

import (
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func TestGenerateAccessToken_NoSecret_ReturnsError(t *testing.T) {
	os.Unsetenv("JWT_SECRET")
	_, err := GenerateAccessToken(JWTClaims{Name: "user", ID: 1, TenantID: uuid.New()})
	if err == nil {
		t.Fatal("expected error when JWT_SECRET is not set")
	}
}

func TestGenerateAccessToken_ValidSecret_ReturnsToken(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret-32chars-xxxxxxxxxxx")
	t.Cleanup(func() { os.Unsetenv("JWT_SECRET") })

	tenantID := uuid.New()
	tok, err := GenerateAccessToken(JWTClaims{
		Name:     "alice",
		ID:       42,
		Profile:  "admin",
		TenantID: tenantID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tok == "" {
		t.Fatal("expected non-empty token")
	}

	// Verify token is parseable and contains expected claims.
	parsed, parseErr := jwt.Parse(tok, func(t *jwt.Token) (interface{}, error) {
		return []byte("test-secret-32chars-xxxxxxxxxxx"), nil
	})
	if parseErr != nil {
		t.Fatalf("token parse failed: %v", parseErr)
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok || !parsed.Valid {
		t.Fatal("expected valid claims")
	}
	if claims["id"].(float64) != 42 {
		t.Fatalf("expected id=42, got %v", claims["id"])
	}
	exp := int64(claims["exp"].(float64))
	if exp <= time.Now().Unix() {
		t.Fatal("expected exp in the future")
	}
}

func TestGenerateRefreshToken_NoSecret_ReturnsError(t *testing.T) {
	os.Unsetenv("JWT_REFRESH_SECRET")
	_, err := GenerateRefreshToken(JWTClaims{ID: 1, TenantID: uuid.New()})
	if err == nil {
		t.Fatal("expected error when JWT_REFRESH_SECRET is not set")
	}
}

func TestGenerateRefreshToken_ValidSecret_ReturnsToken(t *testing.T) {
	os.Setenv("JWT_REFRESH_SECRET", "refresh-secret-32chars-xxxxxxxxx")
	t.Cleanup(func() { os.Unsetenv("JWT_REFRESH_SECRET") })

	tenantID := uuid.New()
	tok, err := GenerateRefreshToken(JWTClaims{
		ID:           7,
		TenantID:     tenantID,
		TokenVersion: 3,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tok == "" {
		t.Fatal("expected non-empty refresh token")
	}

	parsed, parseErr := jwt.Parse(tok, func(t *jwt.Token) (interface{}, error) {
		return []byte("refresh-secret-32chars-xxxxxxxxx"), nil
	})
	if parseErr != nil {
		t.Fatalf("refresh token parse failed: %v", parseErr)
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok || !parsed.Valid {
		t.Fatal("expected valid refresh claims")
	}
	if claims["tokenVersion"].(float64) != 3 {
		t.Fatalf("expected tokenVersion=3, got %v", claims["tokenVersion"])
	}
}
