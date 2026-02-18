package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/backend-go/internal/database"
	"github.com/alltomatos/watinkdev/backend-go/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func ListContacts(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var contacts []models.Contact
	query := database.DB.Where("\"tenantId\" = ?", tenantID).Order("name ASC")

	searchParam := c.Query("searchParam")
	if searchParam != "" {
		query = query.Where("name ILIKE ? OR number ILIKE ?", "%"+searchParam+"%", "%"+searchParam+"%")
	}

	if err := query.Find(&contacts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch contacts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"contacts": contacts,
	})
}

func ShowContact(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")
	id := c.Param("contactId")

	var contact models.Contact
	if err := database.DB.Where("id = ? AND \"tenantId\" = ?", id, tenantID).First(&contact).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contact not found"})
		return
	}

	c.JSON(http.StatusOK, contact)
}

func CreateContact(c *gin.Context) {
	tenantID, _ := c.Get("tenantId")

	var contact models.Contact
	if err := c.ShouldBindJSON(&contact); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	contact.TenantID = tenantID.(uuid.UUID)
	if err := database.DB.Create(&contact).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create contact"})
		return
	}

	c.JSON(http.StatusOK, contact)
}
