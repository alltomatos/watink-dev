package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/services"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/gin-gonic/gin"
)

// AddressLookupController resolves CEP (Brazilian postal code) into address
// fields server-side, so the frontend never calls the external provider
// (e.g. ViaCEP) directly.
type AddressLookupController struct{}

func NewAddressLookupController() *AddressLookupController {
	return &AddressLookupController{}
}

// @Summary      Buscar endereço por CEP
// @Tags         addresses
// @Produce      json
// @Param        cep  query     string  true  "CEP (com ou sem máscara)"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Failure      502  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /addresses/lookup [get]
func (alc *AddressLookupController) Lookup(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}

	cep := c.Query("cep")

	result, err := services.LookupAddressByCEP(c.Request.Context(), db, tenantID, cep)
	if err != nil {
		if err.Error() == "CEP inválido" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": "ERR_ADDRESS_LOOKUP_FAILED: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"street":       result.Street,
		"neighborhood": result.Neighborhood,
		"city":         result.City,
		"state":        result.State,
		"notFound":     result.NotFound,
	})
}
