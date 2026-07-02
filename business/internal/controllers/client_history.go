package controllers

import (
	"net/http"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/pkg/auth"
	"github.com/alltomatos/watinkdev/business/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// historyRecentLimit caps the number of Tickets/Deals returned per History
// call. Pagination is out of scope for this endpoint (see task notes) — this
// is just a sane ceiling so the response never grows unbounded.
const historyRecentLimit = 50

// History returns the Client's transitive Ticket/Deal history (ADR 0023): it
// never depends on a desnormalized ClientID on Ticket/Deal — it always
// resolves through the Contacts currently linked to this Client
// (contactId IN (SELECT id FROM Contacts WHERE clientId = ?)). This is what
// makes the "contact perdido, reaparece por outro número" scenario work: as
// soon as an agent manually links a new Contact to an existing Client, that
// Contact's Tickets/Deals show up here automatically, no backfill needed.
// @Summary      Histórico transitivo do cliente
// @Tags         clients
// @Produce      json
// @Param        id  path  int  true  "ID do cliente"
// @Success      200  {object}  map[string]interface{}
// @Security     BearerAuth
// @Router       /clients/{id}/history [get]
func (cc *ClientController) History(c *gin.Context) {
	db, tenantID, ok := auth.GetScoped(c, "Clients")
	if !ok {
		return
	}
	id, ok := utils.ParseIntParam(c, "id")
	if !ok {
		return
	}

	var client models.Client
	if err := db.Where(`id = ? AND "tenantId" = ?`, id, tenantID).First(&client).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "cliente não encontrado"})
		return
	}

	var contactIDs []int
	if err := db.Session(&gorm.Session{NewDB: true}).Model(&models.Contact{}).
		Where(`"clientId" = ? AND "tenantId" = ?`, id, tenantID).
		Pluck("id", &contactIDs).Error; err != nil {
		utils.RespondWithInternalError(c, err, "ClientHistoryContactIDs")
		return
	}

	tickets := []models.Ticket{}
	deals := []models.Deal{}
	if len(contactIDs) > 0 {
		if err := db.Session(&gorm.Session{NewDB: true}).Where(`"contactId" IN ? AND "tenantId" = ?`, contactIDs, tenantID).
			Preload("Contact").
			Order(`"createdAt" DESC`).
			Limit(historyRecentLimit).
			Find(&tickets).Error; err != nil {
			utils.RespondWithInternalError(c, err, "ClientHistoryTickets")
			return
		}

		if err := db.Session(&gorm.Session{NewDB: true}).Where(`"contactId" IN ? AND "tenantId" = ?`, contactIDs, tenantID).
			Preload("Contact").
			Order(`"createdAt" DESC`).
			Limit(historyRecentLimit).
			Find(&deals).Error; err != nil {
			utils.RespondWithInternalError(c, err, "ClientHistoryDeals")
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"tickets": tickets, "deals": deals})
}
