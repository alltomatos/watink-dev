package utils

import (
	"os"
	"time"

	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/golang-jwt/jwt/v5"
)

func GenerateAccessToken(user models.User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_secret"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": user.Name,
		"id":       user.ID,
		"profile":  user.Profile,
		"tenantId": user.TenantID,
		"exp":      time.Now().Add(time.Hour * 2).Unix(), // 2 hours
	})

	return token.SignedString([]byte(secret))
}

func GenerateRefreshToken(user models.User) (string, error) {
	secret := os.Getenv("JWT_REFRESH_SECRET")
	if secret == "" {
		secret = "default_refresh_secret"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":           user.ID,
		"tokenVersion": user.TokenVersion,
		"exp":          time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	})

	return token.SignedString([]byte(secret))
}
