package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// clientAddressInput is the write DTO for ClientAddress — deliberately NOT
// models.ClientAddress, so a caller can never smuggle ClientID/TenantID/
// Latitude/Longitude straight through Bind.
type clientAddressInput struct {
	Label        string `json:"label"`
	ZipCode      string `json:"zipCode"`
	Street       string `json:"street"`
	Number       string `json:"number"`
	Complement   string `json:"complement"`
	Neighborhood string `json:"neighborhood"`
	City         string `json:"city"`
	State        string `json:"state"`
	IsPrimary    bool   `json:"isPrimary"`
}

// findScopedClient confirms :id resolves to a Client owned by the tenant.
// Writes the 404 response itself when not found.
func findScopedClient(c *gin.Context, db *gorm.DB, tenantID interface{}, clientID int) (models.Client, bool) {
	var client models.Client
	if err := db.Where(`id = ? AND "tenantId" = ?`, clientID, tenantID).First(&client).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "cliente não encontrado"})
		return models.Client{}, false
	}
	return client, true
}

// unsetOtherPrimaryAddresses clears isPrimary from every other address of the
// Client so at most one stays primary. Must run on a Session(NewDB:true)
// handle — reusing the auth.GetScoped db here would accumulate conditions
// from earlier operations and match 0 rows.
func unsetOtherPrimaryAddresses(db *gorm.DB, tenantID interface{}, clientID int, exceptAddressID int) error {
	query := db.Session(&gorm.Session{NewDB: true}).
		Model(&models.ClientAddress{}).
		Where(`"clientId" = ? AND "tenantId" = ?`, clientID, tenantID)
	if exceptAddressID > 0 {
		query = query.Where("id <> ?", exceptAddressID)
	}
	return query.Update("isPrimary", false).Error
}

// geocodeAddress runs the best-effort Nominatim lookup for addr and, when it
// resolves, persists Latitude/Longitude plus the PostGIS geog point. Any
// failure is swallowed by the underlying services (Geocode/
// SyncClientAddressGeography never error the request) — this never blocks
// the caller's response.
func geocodeAddress(c *gin.Context, db *gorm.DB, addr *models.ClientAddress) {
	lat, lng := services.Geocode(c.Request.Context(), addr.Street, addr.Number, addr.Neighborhood, addr.City, addr.State)
	if lat == nil {
		return
	}

	addr.Latitude = lat
	addr.Longitude = lng
	if err := db.Session(&gorm.Session{NewDB: true}).
		Model(&models.ClientAddress{}).
		Where("id = ?", addr.ID).
		Updates(map[string]interface{}{"latitude": lat, "longitude": lng}).Error; err != nil {
		utils.LogOnlyError(c, err, "UpdateClientAddressGeocode")
	}

	if err := services.SyncClientAddressGeography(db.Session(&gorm.Session{NewDB: true}), addr.ID, lat, lng); err != nil {
		utils.LogOnlyError(c, err, "SyncClientAddressGeography")
	}
}

// ListAddresses returns every ClientAddress belonging to :id (Client).
// @Summary      Listar endereços do cliente
// @Tags         clients
// @Produce      json
// @Param        id  path  int  true  "ID do cliente"
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /clients/{id}/addresses [get]
func (cc *ClientController) ListAddresses(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	clientID, ok := utils.ParseIntParam(c, "id")
	if !ok {
		return
	}
	if _, ok := findScopedClient(c, db, tenantID, clientID); !ok {
		return
	}

	var addresses []models.ClientAddress
	if err := db.Where(`"clientId" = ? AND "tenantId" = ?`, clientID, tenantID).
		Order(`"isPrimary" DESC, id ASC`).Find(&addresses).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ListClientAddresses")
		return
	}

	c.JSON(http.StatusOK, gin.H{"addresses": addresses})
}

// CreateAddress adds a new ClientAddress under :id (Client). When isPrimary
// is true, every other address of the Client is demoted first so at most one
// stays primary. Geocoding (Nominatim) runs synchronously but is strictly
// best-effort — a failed/unavailable lookup never blocks the response.
// @Summary      Criar endereço do cliente
// @Tags         clients
// @Accept       json
// @Produce      json
// @Param        id  path  int  true  "ID do cliente"
// @Success      201  {object}  models.ClientAddress
// @Security     BearerAuth
// @Router       /clients/{id}/addresses [post]
func (cc *ClientController) CreateAddress(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	clientID, ok := utils.ParseIntParam(c, "id")
	if !ok {
		return
	}
	if _, ok := findScopedClient(c, db, tenantID, clientID); !ok {
		return
	}

	var in clientAddressInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if in.IsPrimary {
		if err := unsetOtherPrimaryAddresses(db, tenantID, clientID, 0); err != nil {
			utils.RespondWithInternalError(c, err, "UnsetOtherPrimaryClientAddresses")
			return
		}
	}

	addr := models.ClientAddress{
		// ClientID/TenantID always come from the path/context, never from the payload.
		ClientID:     clientID,
		TenantID:     tenantID,
		Label:        in.Label,
		ZipCode:      in.ZipCode,
		Street:       in.Street,
		Number:       in.Number,
		Complement:   in.Complement,
		Neighborhood: in.Neighborhood,
		City:         in.City,
		State:        in.State,
		IsPrimary:    in.IsPrimary,
	}
	if err := db.Session(&gorm.Session{NewDB: true}).Create(&addr).Error; err != nil {
		utils.RespondWithInternalError(c, err, "CreateClientAddress")
		return
	}

	geocodeAddress(c, db, &addr)

	c.JSON(http.StatusCreated, addr)
}

// UpdateAddress edits :addressId under Client :id. Same exclusive-isPrimary
// handling as CreateAddress, and re-runs geocoding since the address fields
// may have changed.
// @Summary      Atualizar endereço do cliente
// @Tags         clients
// @Accept       json
// @Produce      json
// @Param        id         path  int  true  "ID do cliente"
// @Param        addressId  path  int  true  "ID do endereço"
// @Success      200  {object}  models.ClientAddress
// @Security     BearerAuth
// @Router       /clients/{id}/addresses/{addressId} [put]
func (cc *ClientController) UpdateAddress(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	clientID, ok := utils.ParseIntParam(c, "id")
	if !ok {
		return
	}
	addressID, ok := utils.ParseIntParam(c, "addressId")
	if !ok {
		return
	}
	if _, ok := findScopedClient(c, db, tenantID, clientID); !ok {
		return
	}

	var existing models.ClientAddress
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where(`id = ? AND "clientId" = ? AND "tenantId" = ?`, addressID, clientID, tenantID).
		First(&existing).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "endereço não encontrado"})
		return
	}

	var in clientAddressInput
	if err := c.ShouldBindJSON(&in); err != nil {
		utils.RespondWithBindError(c, err)
		return
	}

	if in.IsPrimary {
		if err := unsetOtherPrimaryAddresses(db, tenantID, clientID, addressID); err != nil {
			utils.RespondWithInternalError(c, err, "UnsetOtherPrimaryClientAddresses")
			return
		}
	}

	fields := map[string]interface{}{
		"label":        in.Label,
		"zipCode":      in.ZipCode,
		"street":       in.Street,
		"number":       in.Number,
		"complement":   in.Complement,
		"neighborhood": in.Neighborhood,
		"city":         in.City,
		"state":        in.State,
		"isPrimary":    in.IsPrimary,
	}
	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.ClientAddress{}).
		Where(`id = ? AND "clientId" = ? AND "tenantId" = ?`, addressID, clientID, tenantID).
		Updates(fields).Error; err != nil {
		utils.RespondWithInternalError(c, err, "UpdateClientAddress")
		return
	}

	var updated models.ClientAddress
	if err := db.Session(&gorm.Session{NewDB: true}).
		Where(`id = ? AND "clientId" = ? AND "tenantId" = ?`, addressID, clientID, tenantID).
		First(&updated).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ReloadClientAddressAfterUpdate")
		return
	}

	geocodeAddress(c, db, &updated)

	c.JSON(http.StatusOK, updated)
}

// DeleteAddress hard-deletes :addressId under Client :id — unlike Client
// itself, ClientAddress has no soft-delete contract (see docs/agents/clients.md).
// @Summary      Remover endereço do cliente
// @Tags         clients
// @Produce      json
// @Param        id         path  int  true  "ID do cliente"
// @Param        addressId  path  int  true  "ID do endereço"
// @Success      200  {object}  map[string]string
// @Security     BearerAuth
// @Router       /clients/{id}/addresses/{addressId} [delete]
func (cc *ClientController) DeleteAddress(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	clientID, ok := utils.ParseIntParam(c, "id")
	if !ok {
		return
	}
	addressID, ok := utils.ParseIntParam(c, "addressId")
	if !ok {
		return
	}
	if _, ok := findScopedClient(c, db, tenantID, clientID); !ok {
		return
	}

	res := db.Session(&gorm.Session{NewDB: true}).
		Where(`id = ? AND "clientId" = ? AND "tenantId" = ?`, addressID, clientID, tenantID).
		Delete(&models.ClientAddress{})
	if res.Error != nil {
		utils.RespondWithInternalError(c, res.Error, "DeleteClientAddress")
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "endereço não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Endereço removido"})
}
