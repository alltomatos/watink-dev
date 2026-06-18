package usecases

import (
	"context"
	"errors"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
)

// updateTicketRepo extends mockTicketRepo with call tracking for FindByID
// across the two calls (before and after update).
type updateTicketRepo struct {
	findCalls int
	tickets   []*domain.Ticket // returned in sequence per FindByID call
	findErr   error
	updateErr error
	updated   bool
}

func (m *updateTicketRepo) FindByID(_ context.Context, _ int, _ uuid.UUID) (*domain.Ticket, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	idx := m.findCalls
	m.findCalls++
	if idx < len(m.tickets) {
		return m.tickets[idx], nil
	}
	return nil, nil
}
func (m *updateTicketRepo) FindOpenByContact(_ context.Context, _ uuid.UUID, _ int, _ int) (*domain.Ticket, error) {
	return nil, nil
}
func (m *updateTicketRepo) FindOrCreatePending(_ context.Context, t *domain.Ticket) (*domain.Ticket, error) {
	return t, nil
}
func (m *updateTicketRepo) Save(_ context.Context, _ *domain.Ticket) error { return nil }
func (m *updateTicketRepo) Update(_ context.Context, _ *domain.Ticket, _ map[string]interface{}) error {
	m.updated = true
	return m.updateErr
}

// --- tests ---

func TestUpdateTicket_Success_StatusChange(t *testing.T) {
	tenantID := uuid.New()
	ticket := &domain.Ticket{ID: 1, TenantID: tenantID, Status: "pending"}
	updatedTicket := &domain.Ticket{ID: 1, TenantID: tenantID, Status: "open"}
	tr := &updateTicketRepo{tickets: []*domain.Ticket{ticket, updatedTicket}}
	eb := &mockEventBus{}

	uc := NewUpdateTicketUseCase(tr, eb, nil, nil)
	result, err := uc.Execute(context.Background(), UpdateTicketInput{
		TicketID: 1,
		TenantID: tenantID,
		Status:   "open",
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == nil {
		t.Fatal("expected ticket result, got nil")
	}
	if result.Status != "open" {
		t.Errorf("expected status 'open', got %q", result.Status)
	}
	if !tr.updated {
		t.Error("expected ticket to be updated")
	}
	if len(eb.published) == 0 {
		t.Error("expected TicketStatusChanged event published")
	}
}

func TestUpdateTicket_TicketNotFound_ReturnsNil(t *testing.T) {
	tenantID := uuid.New()
	tr := &updateTicketRepo{tickets: []*domain.Ticket{nil}}
	eb := &mockEventBus{}

	uc := NewUpdateTicketUseCase(tr, eb, nil, nil)
	result, err := uc.Execute(context.Background(), UpdateTicketInput{
		TicketID: 99,
		TenantID: tenantID,
		Status:   "open",
	})

	if err != nil {
		t.Fatalf("expected no error for missing ticket, got %v", err)
	}
	if result != nil {
		t.Error("expected nil result when ticket not found")
	}
}

func TestUpdateTicket_FindByIDError_ReturnsError(t *testing.T) {
	tenantID := uuid.New()
	tr := &updateTicketRepo{findErr: errors.New("db error")}
	eb := &mockEventBus{}

	uc := NewUpdateTicketUseCase(tr, eb, nil, nil)
	_, err := uc.Execute(context.Background(), UpdateTicketInput{
		TicketID: 1,
		TenantID: tenantID,
		Status:   "open",
	})

	if err == nil {
		t.Fatal("expected error from ticket repo")
	}
}

func TestUpdateTicket_UpdateError_ReturnsError(t *testing.T) {
	tenantID := uuid.New()
	ticket := &domain.Ticket{ID: 1, TenantID: tenantID, Status: "pending"}
	tr := &updateTicketRepo{
		tickets:   []*domain.Ticket{ticket},
		updateErr: errors.New("update failed"),
	}
	eb := &mockEventBus{}

	uc := NewUpdateTicketUseCase(tr, eb, nil, nil)
	_, err := uc.Execute(context.Background(), UpdateTicketInput{
		TicketID: 1,
		TenantID: tenantID,
		Status:   "open",
	})

	if err == nil {
		t.Fatal("expected error from update")
	}
}

func TestUpdateTicket_NoFields_ReturnsTicketUnchanged(t *testing.T) {
	tenantID := uuid.New()
	ticket := &domain.Ticket{ID: 1, TenantID: tenantID, Status: "open"}
	tr := &updateTicketRepo{tickets: []*domain.Ticket{ticket}}
	eb := &mockEventBus{}

	uc := NewUpdateTicketUseCase(tr, eb, nil, nil)
	result, err := uc.Execute(context.Background(), UpdateTicketInput{
		TicketID: 1,
		TenantID: tenantID,
		// No Status, UserID, or QueueID — nothing to update
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result == nil {
		t.Fatal("expected ticket, got nil")
	}
	if tr.updated {
		t.Error("ticket should not be updated when no fields provided")
	}
	if len(eb.published) != 0 {
		t.Error("no events should be published when no changes")
	}
}

func TestUpdateTicket_SameStatus_NoEvent(t *testing.T) {
	tenantID := uuid.New()
	ticket := &domain.Ticket{ID: 1, TenantID: tenantID, Status: "open"}
	updatedTicket := &domain.Ticket{ID: 1, TenantID: tenantID, Status: "open"}
	tr := &updateTicketRepo{tickets: []*domain.Ticket{ticket, updatedTicket}}
	eb := &mockEventBus{}

	uc := NewUpdateTicketUseCase(tr, eb, nil, nil)
	_, err := uc.Execute(context.Background(), UpdateTicketInput{
		TicketID: 1,
		TenantID: tenantID,
		Status:   "open", // same as current
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(eb.published) != 0 {
		t.Error("no events should be published when status unchanged")
	}
}

func TestUpdateTicket_UserIDAssignment_NoEvent(t *testing.T) {
	tenantID := uuid.New()
	userID := 42
	ticket := &domain.Ticket{ID: 1, TenantID: tenantID, Status: "open"}
	updatedTicket := &domain.Ticket{ID: 1, TenantID: tenantID, Status: "open", UserID: &userID}
	tr := &updateTicketRepo{tickets: []*domain.Ticket{ticket, updatedTicket}}
	eb := &mockEventBus{}

	uc := NewUpdateTicketUseCase(tr, eb, nil, nil)
	result, err := uc.Execute(context.Background(), UpdateTicketInput{
		TicketID: 1,
		TenantID: tenantID,
		UserID:   &userID,
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.UserID == nil || *result.UserID != userID {
		t.Errorf("expected UserID %d, got %v", userID, result.UserID)
	}
	// Status unchanged → no status event
	if len(eb.published) != 0 {
		t.Error("no status event expected")
	}
}
