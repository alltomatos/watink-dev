package controllers

import (
	"net/http"
	"os"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/alltomatos/watinkdev/backend-go/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type SerializedUser struct {
	ID          int               `json:"id"`
	Name        string            `json:"name"`
	Email       string            `json:"email"`
	Profile     string            `json:"profile"`
	Queues      []models.Queue    `json:"queues"`
	Whatsapp    *models.Whatsapp  `json:"whatsapp"`
	Permissions []string          `json:"permissions"`
	TenantID    string            `json:"tenantId"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).
		Preload("Tenant").
		First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ERR_INVALID_CREDENTIALS"})
		return
	}

	if !user.CheckPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ERR_INVALID_CREDENTIALS"})
		return
	}

	token, err := utils.GenerateAccessToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	refreshToken, err := utils.GenerateRefreshToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	// Fetch permissions
	var permissions []string
	if user.GroupID != nil {
		var group models.Group
		database.DB.Preload("Permissions").First(&group, *user.GroupID)
		for _, p := range group.Permissions {
			permissions = append(permissions, p.GetName())
		}
	}

	serializedUser := SerializedUser{
		ID:          user.ID,
		Name:        user.Name,
		Email:       user.Email,
		Profile:     user.Profile,
		Queues:      []models.Queue{}, // TODO: Fetch queues
		Permissions: permissions,
		TenantID:    user.TenantID.String(),
	}

	// Set refresh token cookie
	c.SetCookie("jrt", refreshToken, 3600*24*7, "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  serializedUser,
	})
}

func RefreshToken(c *gin.Context) {
	tokenString, err := c.Cookie("jrt")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ERR_SESSION_EXPIRED"})
		return
	}

	secret := os.Getenv("JWT_REFRESH_SECRET")
	if secret == "" {
		secret = "default_refresh_secret"
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ERR_INVALID_TOKEN"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ERR_INVALID_TOKEN"})
		return
	}

	userID := int(claims["id"].(float64))
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ERR_USER_NOT_FOUND"})
		return
	}

	newToken, _ := utils.GenerateAccessToken(user)
	newRefreshToken, _ := utils.GenerateRefreshToken(user)

	c.SetCookie("jrt", newRefreshToken, 3600*24*7, "/", "", true, true)

	// Fetch permissions
	var permissions []string
	if user.GroupID != nil {
		var group models.Group
		database.DB.Preload("Permissions").First(&group, *user.GroupID)
		for _, p := range group.Permissions {
			permissions = append(permissions, p.GetName())
		}
	}

	serializedUser := SerializedUser{
		ID:          user.ID,
		Name:        user.Name,
		Email:       user.Email,
		Profile:     user.Profile,
		Queues:      []models.Queue{}, // TODO: Fetch queues
		Permissions: permissions,
		TenantID:    user.TenantID.String(),
	}

	c.JSON(http.StatusOK, gin.H{
		"token": newToken,
		"user":  serializedUser,
	})
}

func Logout(c *gin.Context) {
	c.SetCookie("jrt", "", -1, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
