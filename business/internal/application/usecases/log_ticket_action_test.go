package usecases

import (
	"context"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/infrastructure/repository"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// --- mocks for unit test ---

type mockLogTicketRepo struct {
	ticket  *domain.Ticket
	findErr error
}

func (m *mockLogTicketRepo) FindByID(_ context.Context, _ int, _ uuid.UUID) (*domain.Ticket, error) {
	return m.ticket, m.findErr
}
func (m *mockLogTicketRepo) FindOpenByContact(_ context.Context, _ uuid.UUID, _ int, _ int) (*domain.Ticket, error) {
	return nil, nil
}
func (m *mockLogTicketRepo) FindOrCreatePending(_ context.Context, _ *domain.Ticket) (*domain.Ticket, error) {
	return nil, nil
}
func (m *mockLogTicketRepo) Save(_ context.Context, _ *domain.Ticket) error { return nil }
func (m *mockLogTicketRepo) Update(_ context.Context, _ *domain.Ticket, _ map[string]interface{}) error {
	return nil
}
func (m *mockLogTicketRepo) FindLastAssignedInQueue(_ context.Context, _ int, _ uuid.UUID) (int, error) {
	return 0, nil
}
func (m *mockLogTicketRepo) CountOpenTicketsPerUser(_ context.Context, _ []int, _ uuid.UUID) (map[int]int64, error) {
	return nil, nil
}

type mockTicketLogRepo struct {
	createErr error
	created   bool
}

func (m *mockTicketLogRepo) Create(_ context.Context, _ *models.TicketLog) error {
	m.created = true
	return m.createErr
}

func TestNewLogTicketActionUseCase_NotNil(t *testing.T) {
	uc := NewLogTicketActionUseCase(&mockLogTicketRepo{}, &mockTicketLogRepo{})
	if uc == nil {
		t.Fatal("NewLogTicketActionUseCase returned nil")
	}
}

// --- integration tests ---

func setupLogTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

func insertLogTicket(t *testing.T, db *gorm.DB, tenantID uuid.UUID) int {
	t.Helper()
	var id int
	res := db.Raw(
		`INSERT INTO "Tickets" (status, "contactId", "whatsappId", "tenantId") VALUES (?, ?, ?, ?) RETURNING id`,
		"open", 1, 1, tenantID.String(),
	).Scan(&id)
	if res.Error != nil {
		t.Fatalf("insert ticket: %v", res.Error)
	}
	return id
}

func newLogUCWithDB(db *gorm.DB) *LogTicketActionUseCase {
	return NewLogTicketActionUseCase(
		repository.NewGORMTicketRepo(db),
		repository.NewGormTicketLogRepository(db),
	)
}

func TestLogTicketAction_Execute_Success(t *testing.T) {
	db := setupLogTestDB(t)
	tenantID := uuid.New()
	ticketID := insertLogTicket(t, db, tenantID)

	uc := newLogUCWithDB(db)
	input := LogTicketActionInput{
		TicketID: ticketID,
		TenantID: tenantID,
		LogType:  "open",
		Payload:  map[string]interface{}{"key": "value"},
	}

	err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	var count int64
	db.Model(&models.TicketLog{}).Where(`"ticketId" = ?`, ticketID).Count(&count)
	if count != 1 {
		t.Fatalf("expected 1 TicketLog row, got %d", count)
	}
}

func TestLogTicketAction_Execute_NilPayload(t *testing.T) {
	db := setupLogTestDB(t)
	tenantID := uuid.New()
	ticketID := insertLogTicket(t, db, tenantID)

	uc := newLogUCWithDB(db)
	input := LogTicketActionInput{
		TicketID: ticketID,
		TenantID: tenantID,
		LogType:  "close",
		Payload:  nil,
	}

	err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatalf("expected nil error with nil payload, got %v", err)
	}
}

func TestLogTicketAction_Execute_TicketNotFound(t *testing.T) {
	db := setupLogTestDB(t)
	tenantID := uuid.New()

	uc := newLogUCWithDB(db)
	input := LogTicketActionInput{
		TicketID: 9999,
		TenantID: tenantID,
		LogType:  "transfer",
	}

	err := uc.Execute(context.Background(), input)
	if err == nil {
		t.Fatal("expected error when ticket not found, got nil")
	}
}

func TestLogTicketAction_Execute_WithUserID(t *testing.T) {
	db := setupLogTestDB(t)
	tenantID := uuid.New()
	ticketID := insertLogTicket(t, db, tenantID)

	userID := 42
	uc := newLogUCWithDB(db)
	input := LogTicketActionInput{
		TicketID: ticketID,
		TenantID: tenantID,
		UserID:   &userID,
		LogType:  "transfer",
		Payload:  map[string]interface{}{"from": 1, "to": 2},
	}

	err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}
