package auth

import (
	"errors"
	"net/http"

	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TenantUUIDFromContext extrai o ID do tenant do contexto Gin de forma segura.
func TenantUUIDFromContext(c *gin.Context) (uuid.UUID, error) {
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

// GetDB extracts the GORM DB from Gin context, with fail-fast panic if missing.
// The DB must be injected by the IsAuth middleware.
func GetDB(c *gin.Context) *gorm.DB {
	if db, ok := c.Get("db"); ok {
		return db.(*gorm.DB)
	}
	// Fail-fast: RLS middleware MUST inject DB into context
	panic("DB NOT INJECTED INTO CONTEXT - RLS MISCONFIGURED")
}

// GetScopedDB applies table-specific scoping rules to the database context.
// It adds tenant scoping and optionally user-specific filtering based on profile.
func GetScopedDB(c *gin.Context, table string) *gorm.DB {
	db := GetDB(c)
	userProfile, _ := c.Get("userProfile")
	userID, _ := c.Get("userId")
	tenantID, err := TenantUUIDFromContext(c)
	if err != nil {
		// If tenantUUIDFromContext fails, the request should have been rejected upstream.
		// Fail-closed: return nil tenant scope which will produce no results.
		tenantID = uuid.Nil
	}

	if userProfile == "admin" {
		return db.Where("\"tenantId\" = ?", tenantID)
	}

	switch table {
	case "Tickets":
		return db.Where("\"tenantId\" = ? AND ( \"userId\" = ? OR \"queueId\" IN (SELECT \"queueId\" FROM user_queues WHERE \"userId\" = ?) )", tenantID, userID, userID)
	case "Contacts":
		return db.Where("\"tenantId\" = ? AND ( \"walletUserId\" = ? OR id IN (SELECT \"contactId\" FROM \"Tickets\" WHERE \"userId\" = ? OR \"queueId\" IN (SELECT \"queueId\" FROM user_queues WHERE \"userId\" = ?)) )", tenantID, userID, userID, userID)
	default:
		return db.Where("\"tenantId\" = ?", tenantID)
	}
}

// GetScoped extracts the RLS-scoped DB and validated tenantID from the Gin context.
// If tenantID is missing or invalid, it responds with a safe error and returns ok=false.
// Usage: db, tenantID, ok := auth.GetScoped(c, "Tickets"); if !ok { return }
func GetScoped(c *gin.Context, table string) (*gorm.DB, uuid.UUID, bool) {
	tenantID, err := TenantUUIDFromContext(c)
	if err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, err, "Invalid tenant context")
		return nil, uuid.Nil, false
	}

	db := GetScopedDB(c, table)
	// GetScopedDB uses GetDB which panics on nil — catch that via recover
	// is not needed here since GetDB panic means RLS is misconfigured (fail-fast is correct).
	return db, tenantID, true
}
