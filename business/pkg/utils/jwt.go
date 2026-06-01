package utils

import (
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims holds the fields needed to generate JWT tokens.
// Decouples token generation from any specific model struct.
type JWTClaims struct {
	Name         string
	ID           int
	Profile      string
	TenantID     uuid.UUID
	TokenVersion int
}

func GenerateAccessToken(claims JWTClaims) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_secret"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": claims.Name,
		"id":       claims.ID,
		"profile":  claims.Profile,
		"tenantId": claims.TenantID,
		"exp":      time.Now().Add(time.Hour * 2).Unix(),
	})

	return token.SignedString([]byte(secret))
}

func GenerateRefreshToken(claims JWTClaims) (string, error) {
	secret := os.Getenv("JWT_REFRESH_SECRET")
	if secret == "" {
		secret = "default_refresh_secret"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":           claims.ID,
		"tenantId":     claims.TenantID,
		"tokenVersion": claims.TokenVersion,
		"exp":          time.Now().Add(time.Hour * 24 * 7).Unix(),
	})

	return token.SignedString([]byte(secret))
}