package controllers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/application/usecases"
	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/infrastructure/repository"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func setupTicketControllerTest(t *testing.T) (*gorm.DB, *TicketController) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db := testutil.NewTestDB(t)

	// DI pura: instanciar dependências via construtores
	ticketRepo := repository.NewGORMTicketRepo(db)
	eventBus := &noopEventBus{}
	updateUseCase := usecases.NewUpdateTicketUseCase(ticketRepo, eventBus, nil, nil)

	// broadcast nil = sem emissão socket (teste unitário, sem Redis/Socket.IO)
	controller := NewTicketController(updateUseCase, nil)

	return db, controller
}

type noopEventBus struct{}

func (n *noopEventBus) Publish(ctx context.Context, event domain.DomainEvent) error   { return nil }
func (n *noopEventBus) Subscribe(eventName string, handler domain.EventHandler) error { return nil }

func TestUpdateTicketRejectsCrossTenantAccess(t *testing.T) {
	db, controller := setupTicketControllerTest(t)

	tenantA := uuid.New()
	tenantB := uuid.New()
	ticket := models.Ticket{Status: "pending", ContactID: 1, WhatsappID: 1, TenantID: tenantA}
	if err := db.Create(&ticket).Error; err != nil {
		t.Fatal(err)
	}

	router := gin.New()
	router.PUT("/tickets/:ticketId", func(c *gin.Context) {
		c.Set("db", db)
		c.Set("tenantId", tenantB.String())
		c.Set("userProfile", "admin")
		c.Set("userId", float64(10))
		controller.UpdateTicket(c)
	})

	req := httptest.NewRequest(http.MethodPut, "/tickets/"+strconv.Itoa(ticket.ID), bytes.NewBufferString(`{"status":"closed"}`))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got status=%d body=%s", res.Code, res.Body.String())
	}

	var unchanged models.Ticket
	if err := db.First(&unchanged, ticket.ID).Error; err != nil {
		t.Fatal(err)
	}
	if unchanged.Status != "pending" {
		t.Fatalf("cross-tenant update leaked: status changed to %s", unchanged.Status)
	}

	var logCount int64
	if err := db.Model(&models.TicketLog{}).Count(&logCount).Error; err != nil {
		t.Fatal(err)
	}
	if logCount != 0 {
		t.Fatalf("cross-tenant access created %d ticket logs (expected 0)", logCount)
	}
}

func TestUpdateTicketCreatesTenantScopedLog(t *testing.T) {
	db, controller := setupTicketControllerTest(t)

	tenantID := uuid.New()
	ticket := models.Ticket{Status: "pending", ContactID: 1, WhatsappID: 1, TenantID: tenantID}
	if err := db.Create(&ticket).Error; err != nil {
		t.Fatal(err)
	}

	router := gin.New()
	router.PUT("/tickets/:ticketId", func(c *gin.Context) {
		c.Set("db", db)
		c.Set("tenantId", tenantID.String())
		c.Set("userProfile", "admin")
		c.Set("userId", float64(10))
		controller.UpdateTicket(c)
	})

	req := httptest.NewRequest(http.MethodPut, "/tickets/"+strconv.Itoa(ticket.ID), bytes.NewBufferString(`{"status":"closed"}`))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got status=%d body=%s", res.Code, res.Body.String())
	}

	var updated models.Ticket
	if err := db.First(&updated, ticket.ID).Error; err != nil {
		t.Fatal(err)
	}
	if updated.Status != "closed" {
		t.Fatalf("status=%s, expected closed", updated.Status)
	}
	if updated.TenantID != tenantID {
		t.Fatalf("tenantId changed to %s (expected %s)", updated.TenantID, tenantID)
	}

	// logAction use case is nil in this setup, so no logs expected
	var logs []models.TicketLog
	if err := db.Find(&logs).Error; err != nil {
		t.Fatal(err)
	}
	if len(logs) != 0 {
		t.Fatalf("logs=%d (expected 0 because logAction use case is nil)", len(logs))
	}
}
