package controllers

import (
	"bytes"
	"context"
	"encoding/json"
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
)

// stubEventBus is a no-op EventBus for tests.
type stubEventBus struct{}

func (s *stubEventBus) Publish(_ context.Context, _ domain.DomainEvent) error { return nil }
func (s *stubEventBus) Subscribe(_ string, _ domain.EventHandler) error        { return nil }

// stubMessageRepo is a no-op MessageRepository for tests.
type stubMessageRepo struct{}

func (s *stubMessageRepo) Create(_ context.Context, _ *domain.Message) error { return nil }
func (s *stubMessageRepo) CreateIfNotExists(_ context.Context, _ *domain.Message) error {
	return nil
}
func (s *stubMessageRepo) FindByID(_ context.Context, _ string, _ uuid.UUID) (*domain.Message, error) {
	return nil, nil
}
func (s *stubMessageRepo) FindOldestByTicket(_ context.Context, _ int, _ uuid.UUID) (*domain.Message, error) {
	return nil, nil
}
func (s *stubMessageRepo) ExistsByID(_ context.Context, _ string, _ uuid.UUID) (bool, error) {
	return false, nil
}
func (s *stubMessageRepo) Update(_ context.Context, _ *domain.Message, _ map[string]interface{}) error {
	return nil
}


func TestUpdateTicket(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()

	ticketRepo := repository.NewGORMTicketRepo(db)
	updateUC := usecases.NewUpdateTicketUseCase(ticketRepo, &stubEventBus{}, nil, nil)
	tc := NewTicketController(updateUC, nil, &stubMessageRepo{}, &stubPublisher{})

	// Seed whatsapp + contact + ticket
	wa := models.Whatsapp{Name: "WA", TenantID: tenantID, Status: "CONNECTED"}
	if err := db.Create(&wa).Error; err != nil {
		t.Fatal(err)
	}
	contact := models.Contact{Name: "C", Number: "5511999999999", TenantID: tenantID}
	if err := db.Create(&contact).Error; err != nil {
		t.Fatal(err)
	}
	ticket := models.Ticket{
		Status:     "pending",
		TenantID:   tenantID,
		ContactID:  contact.ID,
		WhatsappID: wa.ID,
	}
	if err := db.Create(&ticket).Error; err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("db", db)
		c.Set("tenantId", tenantID)
		c.Set("userProfile", "admin")
		c.Set("userId", float64(1)) // float64 as Gin parses JSON numbers
		c.Next()
	})
	r.PUT("/tickets/:ticketId", tc.UpdateTicket)

	t.Run("happy path — updates status", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{"status": "open"})
		req := httptest.NewRequest(http.MethodPut, "/tickets/"+strconv.Itoa(ticket.ID), bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d — %s", res.Code, res.Body.String())
		}
	})

	t.Run("ticket not found returns 404", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{"status": "open"})
		req := httptest.NewRequest(http.MethodPut, "/tickets/999999", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", res.Code)
		}
	})
}

func TestRecoverHistory(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()

	pub := &stubPublisher{}
	ticketRepo := repository.NewGORMTicketRepo(db)
	updateUC := usecases.NewUpdateTicketUseCase(ticketRepo, &stubEventBus{}, nil, nil)
	tc := NewTicketController(updateUC, nil, &stubMessageRepo{}, pub)

	// Seed whatsapp + contact with number + ticket
	wa := models.Whatsapp{Name: "WA", TenantID: tenantID, Status: "CONNECTED"}
	if err := db.Create(&wa).Error; err != nil {
		t.Fatal(err)
	}
	contact := models.Contact{Name: "C", Number: "5511999999999", TenantID: tenantID}
	if err := db.Create(&contact).Error; err != nil {
		t.Fatal(err)
	}
	ticket := models.Ticket{
		Status:     "open",
		TenantID:   tenantID,
		ContactID:  contact.ID,
		WhatsappID: wa.ID,
	}
	if err := db.Create(&ticket).Error; err != nil {
		t.Fatal(err)
	}

	r := gin.New()
	r.Use(testScopedMiddleware(db, tenantID.String()))
	r.POST("/tickets/:ticketId/history/recover", tc.RecoverHistory)

	t.Run("happy path — publishes recover command", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"range": "7d"})
		req := httptest.NewRequest(http.MethodPost, "/tickets/"+strconv.Itoa(ticket.ID)+"/history/recover", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusAccepted {
			t.Fatalf("expected 202, got %d — %s", res.Code, res.Body.String())
		}
		if len(pub.calls) == 0 {
			t.Fatal("expected PublishCommand to be called")
		}
	})

	t.Run("ticket not found returns 404", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"range": "1d"})
		req := httptest.NewRequest(http.MethodPost, "/tickets/999999/history/recover", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", res.Code)
		}
	})

	t.Run("invalid ticket id returns 400", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"range": "1d"})
		req := httptest.NewRequest(http.MethodPost, "/tickets/notanint/history/recover", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)

		if res.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", res.Code)
		}
	})
}
