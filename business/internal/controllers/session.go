package controllers

import (
	"errors"
	"log/slog"
	"net/http"
	"os"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AuthController struct {
	userRepo domain.UserRepository
}

func NewAuthController(ur domain.UserRepository) *AuthController {
	return &AuthController{userRepo: ur}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (ac *AuthController) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	domainUser, err := ac.userRepo.FindByEmailForAuth(c.Request.Context(), req.Email)
	if err != nil || domainUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ERR_INVALID_CREDENTIALS"})
		return
	}

	userModel := domain.User{PasswordHash: domainUser.PasswordHash}
	if !userModel.CheckPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ERR_INVALID_CREDENTIALS"})
		return
	}

	claims := utils.JWTClaims{
		Name:         domainUser.Name,
		ID:           domainUser.ID,
		Profile:      domainUser.Profile,
		TenantID:     domainUser.TenantID,
		TokenVersion: domainUser.TokenVersion,
	}

	token, err := utils.GenerateAccessToken(claims)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	refreshToken, err := utils.GenerateRefreshToken(claims)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	c.SetCookie("refreshToken", refreshToken, 3600*24*7, "/", "", true, true)

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  domainUser,
	})
}

func (ac *AuthController) RefreshToken(c *gin.Context) {
	refreshTokenStr, err := c.Cookie("refreshToken")
	if err != nil || refreshTokenStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No refresh token provided"})
		return
	}

	secret := os.Getenv("JWT_REFRESH_SECRET")
	if secret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server misconfiguration — JWT_REFRESH_SECRET not set"})
		return
	}

	token, err := jwt.Parse(refreshTokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			slog.Warn("Unexpected JWT signing method", "alg", token.Header["alg"])
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		slog.Warn("Refresh token validation failed", "error", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token claims"})
		return
	}

	userID := int(claims["id"].(float64))
	tenantIDStr := claims["tenantId"].(string)
	tokenVersion := int(claims["tokenVersion"].(float64))

	tenantUUID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid tenant ID in token"})
		return
	}

	user, err := ac.userRepo.FindByID(c.Request.Context(), userID, tenantUUID)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if user.TokenVersion != tokenVersion {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token version mismatch — please re-login"})
		return
	}

	newClaims := utils.JWTClaims{
		Name:         user.Name,
		ID:           user.ID,
		Profile:      user.Profile,
		TenantID:     user.TenantID,
		TokenVersion: user.TokenVersion,
	}

	accessToken, err := utils.GenerateAccessToken(newClaims)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": accessToken,
		"user":  user,
	})
}

func (ac *AuthController) Logout(c *gin.Context) {
	c.SetCookie("refreshToken", "", -1, "/", "", true, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
