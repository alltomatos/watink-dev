package controllers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/alltomatos/watinkdev/bussines/internal/models"
	"github.com/alltomatos/watinkdev/bussines/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListUsers(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	
	var users []models.User
	if err := database.DB.Where("\"tenantId\" = ?", tenantID).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
	})
}

func ShowUser(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("userId")

	var user models.User
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func CreateUser(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	tid, _ := uuid.Parse(tenantID.(string))

	// SaaS Limit Check
	limitService := services.NewPlanLimitService()
	if err := limitService.CheckLimit(tid, "users"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user.TenantID = tid
	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func UpdateUser(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("userId")

	var user models.User
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Handle password separately
	if pwd, ok := req["password"].(string); ok && pwd != "" {
		if err := user.HashPassword(pwd); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		database.DB.Model(&user).Update("passwordHash", user.PasswordHash)
	}

	// Handle Queues
	if queueIds, ok := req["queueIds"].([]interface{}); ok {
		var queues []models.Queue
		for _, idVal := range queueIds {
			idStr := fmt.Sprintf("%v", idVal)
			qid, _ := strconv.Atoi(idStr)
			var q models.Queue
			if err := database.DB.First(&q, qid).Error; err == nil {
				queues = append(queues, q)
			}
		}
		database.DB.Model(&user).Association("Queues").Replace(queues)
	}

	// Handle Permissions
	if permIds, ok := req["permissions"].([]interface{}); ok {
		var permissions []models.Permission
		for _, idVal := range permIds {
			idStr := fmt.Sprintf("%v", idVal)
			pid, _ := strconv.Atoi(idStr)
			var p models.Permission
			if err := database.DB.First(&p, pid).Error; err == nil {
				permissions = append(permissions, p)
			}
		}
		database.DB.Model(&user).Association("Permissions").Replace(permissions)
	}

	// Pre-process fields to avoid DB type errors
	updateMap := make(map[string]interface{})
	
	// String fields
	if v, ok := req["name"].(string); ok { updateMap["name"] = v }
	if v, ok := req["email"].(string); ok { updateMap["email"] = v }
	if v, ok := req["profile"].(string); ok { updateMap["profile"] = v }
	
	// Bigint / Pointer fields
	if v, ok := req["whatsappId"]; ok {
		if v == "" || v == nil {
			updateMap["whatsappId"] = nil
		} else {
			idStr := fmt.Sprintf("%v", v)
			idInt, _ := strconv.ParseInt(idStr, 10, 64)
			updateMap["whatsappId"] = idInt
		}
	}

	if v, ok := req["groupId"]; ok {
		if v == "" || v == nil {
			updateMap["groupId"] = nil
		} else {
			idStr := fmt.Sprintf("%v", v)
			idInt, _ := strconv.ParseInt(idStr, 10, 64)
			updateMap["groupId"] = idInt
		}
	}

	if err := database.DB.Model(&user).Updates(updateMap).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func DeleteUser(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("userId")

	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).Delete(&models.User{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}
