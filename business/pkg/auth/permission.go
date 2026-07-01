package auth

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RequirePermission returns a gin.HandlerFunc that enforces a real backend
// Permission check ("resource:action" — ADR 0022), replacing the historical
// cosmetic-only enforcement (permission only hid a frontend menu item).
//
// Must run AFTER middleware.IsAuth, which injects userId, tenantId, alcance
// and db into the Gin context (see business/internal/middleware/auth.go).
//
// Bypass: alcance "tenant" (Gerente Geral/Administrador) and "plataforma"
// (superadmin) already see everything within their scope — same rule as
// auth.GetScopedDB — so they skip the Permission check entirely.
//
// Otherwise (alcance "proprio" or "setor"): the effective permission set is
// the union of (a) the user's base Cargo Permissions (cargo_permissoes) and
// (b) the Gestor package — the Permissions of the Cargo literally named
// "Gestor" in the same tenant — IF the user has any user_setores row with
// ehGestor=true. This mirrors repository.effectivePermissionNames (GAP-2a)
// but is implemented independently here via direct SQL/GORM queries instead
// of importing internal/infrastructure/repository: pkg/auth is a foundational
// package (imported BY internal/*), so depending on internal/infrastructure
// would invert that direction. There is no compile-time import cycle today,
// but the dependency would still point the wrong way — pkg/ should not
// reach into internal/infrastructure just to reuse one helper. Duplicating
// two small, targeted EXISTS-style queries is simpler and keeps pkg/auth
// self-contained.
//
// Fail-closed: any DB/query error during the check results in 403, never a
// silent pass-through.
func RequirePermission(resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		alcance, _ := c.Get("alcance")
		alcanceStr, _ := alcance.(string)

		if alcanceStr == "tenant" || alcanceStr == "plataforma" {
			c.Next()
			return
		}

		db := GetDB(c)

		userID, okUser := userIDFromContext(c)
		tenantID, errTenant := TenantUUIDFromContext(c)
		if !okUser || errTenant != nil {
			denyPermission(c, resource, action)
			return
		}

		var user models.User
		if err := db.
			Where(`id = ? AND "tenantId" = ?`, userID, tenantID).
			First(&user).Error; err != nil {
			denyPermission(c, resource, action)
			return
		}

		hasViaCargo, err := cargoHasPermission(db, user.CargoID, resource, action)
		if err != nil {
			denyPermission(c, resource, action)
			return
		}
		if hasViaCargo {
			c.Next()
			return
		}

		hasViaGestor, err := gestorPackageHasPermission(db, user.ID, tenantID, resource, action)
		if err != nil {
			denyPermission(c, resource, action)
			return
		}
		if hasViaGestor {
			c.Next()
			return
		}

		denyPermission(c, resource, action)
	}
}

func denyPermission(c *gin.Context, resource, action string) {
	c.JSON(http.StatusForbidden, gin.H{"error": "permissão negada: requer " + resource + ":" + action})
	c.Abort()
}

// userIDFromContext extracts the numeric userId injected by middleware.IsAuth.
// JWT claims decode numbers as float64 (encoding/json default), matching the
// cast pattern already used across controllers (e.g. ticket_mutation.go).
func userIDFromContext(c *gin.Context) (int, bool) {
	v, ok := c.Get("userId")
	if !ok || v == nil {
		return 0, false
	}
	switch n := v.(type) {
	case float64:
		return int(n), true
	case int:
		return n, true
	default:
		return 0, false
	}
}

// cargoHasPermission reports whether the user's base Cargo grants
// resource:action, via an explicit JOIN against cargo_permissoes (camelCase
// columns cargoId/permissionId — NOT GORM's many2many Association(), which
// falls back to snake_case join-table columns; see models/cargo.go).
func cargoHasPermission(db *gorm.DB, cargoID *int, resource, action string) (bool, error) {
	if cargoID == nil {
		return false, nil
	}
	var count int64
	err := db.
		Table(`"Permissions"`).
		Joins(`JOIN cargo_permissoes ON cargo_permissoes."permissionId" = "Permissions".id`).
		Where(`cargo_permissoes."cargoId" = ? AND "Permissions".resource = ? AND "Permissions".action = ?`, *cargoID, resource, action).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// gestorPackageHasPermission reports whether userID grants resource:action
// via the Gestor package: userID must have at least one user_setores row
// with ehGestor=true, AND the tenant must have a Cargo literally named
// "Gestor" that grants the permission. If the tenant has no such Cargo
// (renamed/removed in a customized setup), this returns false, false — not
// an error; it simply contributes nothing extra.
func gestorPackageHasPermission(db *gorm.DB, userID int, tenantID uuid.UUID, resource, action string) (bool, error) {
	var gestorCount int64
	if err := db.
		Model(&models.UserSetor{}).
		Where(`"userId" = ? AND "ehGestor" = true`, userID).
		Count(&gestorCount).Error; err != nil {
		return false, err
	}
	if gestorCount == 0 {
		return false, nil
	}

	var cargo models.Cargo
	err := db.
		Where(`"name" = ? AND "tenantId" = ?`, "Gestor", tenantID).
		First(&cargo).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, err
	}

	return cargoHasPermission(db, &cargo.ID, resource, action)
}
