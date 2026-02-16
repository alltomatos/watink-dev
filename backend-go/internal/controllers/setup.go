package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
)

func CheckSetup(c *gin.Context) {
	var count int64
	database.DB.Model(&models.User{}).Count(&count)
	c.JSON(http.StatusOK, gin.H{"needsSetup": count == 0})
}

type SetupRequest struct {
	FirstName string `json:"firstName" binding:"required"`
	LastName  string `json:"lastName"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required"`
	Document  string `json:"document"`
}

func InitialSetup(c *gin.Context) {
	var count int64
	database.DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "System already initialized"})
		return
	}

	var req SetupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Plan
	plan := models.Plan{
		Name:        "Community",
		PluginQuota: 10,
		Active:      true,
	}
	database.DB.FirstOrCreate(&plan, models.Plan{Name: "Community"})

	// 2. Tenant
	tenant := models.Tenant{
		Name:     req.FirstName + "'s Workspace",
		Status:   "active",
		Document: req.Document,
	}
	database.DB.Create(&tenant)

	// 3. User
	user := models.User{
		Name:     req.FirstName + " " + req.LastName,
		Email:    req.Email,
		Profile:  "superadmin",
		TenantID: tenant.ID,
	}
	user.HashPassword(req.Password)
	database.DB.Create(&user)

	// 4. Update Tenant Owner
	database.DB.Model(&tenant).Update("ownerId", user.ID)

	// 5. Default Settings
	settings := []models.Setting{
		{Key: "systemTitle", Value: "Watink", TenantID: tenant.ID},
		{Key: "systemLogo", Value: "public/logo.png", TenantID: tenant.ID},
		{Key: "systemLogoEnabled", Value: "true", TenantID: tenant.ID},
		{Key: "login_layout", Value: "centered", TenantID: tenant.ID},
	}
	database.DB.Create(&settings)

	c.JSON(http.StatusOK, gin.H{"message": "System initialized successfully"})
}
