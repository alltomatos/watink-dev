package usecases

import (
	"context"
	"errors"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
)

// --- local mocks ---

type mockTicketRepo struct {
	ticket    *domain.Ticket
	findErr   error
	updateErr error
	updated   bool
}

func (m *mockTicketRepo) FindByID(_ context.Context, _ int, _ uuid.UUID) (*domain.Ticket, error) {
	return m.ticket, m.findErr
}
func (m *mockTicketRepo) FindOpenByContact(_ context.Context, _ uuid.UUID, _ int, _ int) (*domain.Ticket, error) {
	return nil, nil
}
func (m *mockTicketRepo) FindOrCreatePending(_ context.Context, t *domain.Ticket) (*domain.Ticket, error) {
	return t, nil
}
func (m *mockTicketRepo) Save(_ context.Context, _ *domain.Ticket) error { return nil }
func (m *mockTicketRepo) Update(_ context.Context, _ *domain.Ticket, _ map[string]interface{}) error {
	m.updated = true
	return m.updateErr
}

type mockQueueRepo struct {
	queue   *domain.Queue
	findErr error
}

func (m *mockQueueRepo) FindByID(_ context.Context, _ int, _ uuid.UUID) (*domain.Queue, error) {
	return m.queue, m.findErr
}
func (m *mockQueueRepo) FindAll(_ context.Context, _ uuid.UUID) ([]domain.Queue, error) {
	return nil, nil
}
func (m *mockQueueRepo) Save(_ context.Context, _ *domain.Queue) error { return nil }

type mockEventBus struct {
	published []domain.DomainEvent
}

func (m *mockEventBus) Publish(_ context.Context, e domain.DomainEvent) error {
	m.published = append(m.published, e)
	return nil
}
func (m *mockEventBus) Subscribe(_ string, _ domain.EventHandler) error { return nil }

// --- helpers ---

func newUseCase(tr *mockTicketRepo, qr *mockQueueRepo, eb *mockEventBus) *DistributeTicketUseCase {
	return NewDistributeTicketUseCase(tr, qr, eb, nil)
}

// --- tests ---

func TestDistributeTicket_QueueNotFound_ReturnsError(t *testing.T) {
	qr := &mockQueueRepo{findErr: errors.New("db error")}
	tr := &mockTicketRepo{}
	eb := &mockEventBus{}
	uc := newUseCase(tr, qr, eb)

	err := uc.Execute(context.Background(), 1, 10, uuid.New())
	if err == nil {
		t.Fatal("expected error when queue repo fails")
	}
}

func TestDistributeTicket_QueueNil_ReturnsNil(t *testing.T) {
	qr := &mockQueueRepo{queue: nil}
	tr := &mockTicketRepo{}
	eb := &mockEventBus{}
	uc := newUseCase(tr, qr, eb)

	err := uc.Execute(context.Background(), 1, 10, uuid.New())
	if err != nil {
		t.Fatalf("expected nil when queue not found, got %v", err)
	}
}

func TestDistributeTicket_TicketNotFound_ReturnsError(t *testing.T) {
	qr := &mockQueueRepo{queue: &domain.Queue{ID: 10, DistributionStrategy: "MANUAL"}}
	tr := &mockTicketRepo{findErr: errors.New("ticket db error")}
	eb := &mockEventBus{}
	uc := newUseCase(tr, qr, eb)

	err := uc.Execute(context.Background(), 1, 10, uuid.New())
	if err == nil {
		t.Fatal("expected error when ticket repo fails")
	}
}

func TestDistributeTicket_TicketNil_ReturnsNil(t *testing.T) {
	qr := &mockQueueRepo{queue: &domain.Queue{ID: 10, DistributionStrategy: "MANUAL"}}
	tr := &mockTicketRepo{ticket: nil}
	eb := &mockEventBus{}
	uc := newUseCase(tr, qr, eb)

	err := uc.Execute(context.Background(), 1, 10, uuid.New())
	if err != nil {
		t.Fatalf("expected nil when ticket not found, got %v", err)
	}
}

func TestDistributeTicket_ManualStrategy_Skips(t *testing.T) {
	qr := &mockQueueRepo{queue: &domain.Queue{ID: 10, DistributionStrategy: "MANUAL"}}
	tr := &mockTicketRepo{ticket: &domain.Ticket{ID: 1, ContactID: 5}}
	eb := &mockEventBus{}
	uc := newUseCase(tr, qr, eb)

	err := uc.Execute(context.Background(), 1, 10, uuid.New())
	if err != nil {
		t.Fatalf("MANUAL strategy should return nil, got %v", err)
	}
	if tr.updated {
		t.Error("ticket should not be updated for MANUAL strategy")
	}
	if len(eb.published) != 0 {
		t.Error("no events should be published for MANUAL strategy")
	}
}

func TestDistributeTicket_EmptyStrategy_Skips(t *testing.T) {
	qr := &mockQueueRepo{queue: &domain.Queue{ID: 10, DistributionStrategy: ""}}
	tr := &mockTicketRepo{ticket: &domain.Ticket{ID: 1, ContactID: 5}}
	eb := &mockEventBus{}
	uc := newUseCase(tr, qr, eb)

	err := uc.Execute(context.Background(), 1, 10, uuid.New())
	if err != nil {
		t.Fatalf("empty strategy should return nil, got %v", err)
	}
}

func TestDistributeTicket_UnknownStrategy_Skips(t *testing.T) {
	qr := &mockQueueRepo{queue: &domain.Queue{ID: 10, DistributionStrategy: "UNKNOWN_STRATEGY"}}
	tr := &mockTicketRepo{ticket: &domain.Ticket{ID: 1, ContactID: 5}}
	eb := &mockEventBus{}
	// db nil but won't be reached before findQueueUsers which uses db — needs nil check
	// We skip the db path by relying on findQueueUsers panicking; use a db that returns empty.
	// Since we can't mock gorm without sqlmock, skip this sub-test or accept the panic.
	// The test covers the strategy dispatch "default" case when users list comes back empty
	// after a db call. Without sqlmock we can only verify no crash at strategy dispatch level.
	// Mark as skipped for db-dependent paths.
	t.Skip("requires sqlmock for findQueueUsers db call")
	uc := newUseCase(tr, qr, eb)
	err := uc.Execute(context.Background(), 1, 10, uuid.New())
	if err != nil {
		t.Fatalf("unknown strategy should return nil, got %v", err)
	}
}

func TestNewDistributeTicketUseCase_NotNil(t *testing.T) {
	qr := &mockQueueRepo{}
	tr := &mockTicketRepo{}
	eb := &mockEventBus{}
	uc := NewDistributeTicketUseCase(tr, qr, eb, nil)
	if uc == nil {
		t.Fatal("NewDistributeTicketUseCase returned nil")
	}
}
