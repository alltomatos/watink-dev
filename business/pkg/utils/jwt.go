package utils

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTClaims holds the fields needed to generate JWT tokens.
// Decouples token generation from any specific model struct.
type JWTClaims struct {
	Name         string
	ID           int
	Alcance      string
	TenantID     uuid.UUID
	TokenVersion int
}

func GenerateAccessToken(claims JWTClaims) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET must be set — security-critical")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": claims.Name,
		"id":       claims.ID,
		"alcance":  claims.Alcance,
		"tenantId": claims.TenantID,
		"exp":      time.Now().Add(time.Hour * 2).Unix(),
	})

	return token.SignedString([]byte(secret))
}

func GenerateRefreshToken(claims JWTClaims) (string, error) {
	secret := os.Getenv("JWT_REFRESH_SECRET")
	if secret == "" {
		return "", fmt.Errorf("JWT_REFRESH_SECRET must be set — security-critical")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":           claims.ID,
		"tenantId":     claims.TenantID,
		"tokenVersion": claims.TokenVersion,
		"exp":          time.Now().Add(time.Hour * 24 * 7).Unix(),
	})

	return token.SignedString([]byte(secret))
}
