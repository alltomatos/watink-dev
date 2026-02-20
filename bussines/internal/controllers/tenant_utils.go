package controllers

import (
	"errors"

	"github.com/alltomatos/watinkdev/bussines/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func tenantUUIDFromContext(c *gin.Context) (uuid.UUID, error) {
	v, ok := c.Get("tenantId")
	if !ok || v == nil {
		return uuid.Nil, errors.New("tenantId not found")
	}

	switch t := v.(type) {
	case uuid.UUID:
		return t, nil
	case string:
		id, err := uuid.Parse(t)
		if err != nil {
			return uuid.Nil, err
		}
		return id, nil
	default:
		return uuid.Nil, errors.New("invalid tenantId type")
	}
}

func getDB(c *gin.Context) *gorm.DB {
	if db, ok := c.Get("db"); ok {
		return db.(*gorm.DB)
	}
	return database.DB
}

func getScopedDB(c *gin.Context, table string) *gorm.DB {
	db := getDB(c)
	userProfile, _ := c.Get("userProfile")
	userID, _ := c.Get("userId")
	tenantID, _ := c.Get("tenantId")

	if userProfile == "admin" {
		return db.Where("\"tenantId\" = ?", tenantID)
	}

	switch table {
	case "Tickets":
		return db.Where("\"tenantId\" = ? AND ( \"userId\" = ? OR \"queueId\" IN (SELECT \"queueId\" FROM \"UserQueues\" WHERE \"userId\" = ?) )", tenantID, userID, userID)
	case "Contacts":
		// User sees contacts in their wallet OR contacts that have tickets in their scoped queues/ownership
		return db.Where("\"tenantId\" = ? AND ( \"walletUserId\" = ? OR id IN (SELECT \"contactId\" FROM \"Tickets\" WHERE \"userId\" = ? OR \"queueId\" IN (SELECT \"queueId\" FROM \"UserQueues\" WHERE \"userId\" = ?)) )", tenantID, userID, userID, userID)
	default:
		return db.Where("\"tenantId\" = ?", tenantID)
	}
}
