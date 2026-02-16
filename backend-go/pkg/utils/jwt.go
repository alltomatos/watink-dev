package utils

import (
	"os"
	"time"

	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/golang-jwt/jwt/v5"
)

func GenerateToken(user models.User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_secret"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":       user.ID,
		"email":    user.Email,
		"profile":  user.Profile,
		"tenantId": user.TenantID,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	return token.SignedString([]byte(secret))
}
