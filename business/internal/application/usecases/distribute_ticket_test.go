package usecases

import (
	"context"
	"errors"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/infrastructure/repository"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"gorm.io/gorm"
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
func (m *mockTicketRepo) FindLastAssignedInQueue(_ context.Context, _ int, _ uuid.UUID) (int, error) {
	return 0, nil
}
func (m *mockTicketRepo) CountOpenTicketsPerUser(_ context.Context, _ []int, _ uuid.UUID) (map[int]int64, error) {
	return map[int]int64{}, nil
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

type mockContactRepo struct {
	contact *domain.Contact
	err     error
}

func (m *mockContactRepo) FindByID(_ context.Context, _ int, _ uuid.UUID) (*domain.Contact, error) {
	return m.contact, m.err
}
func (m *mockContactRepo) FindByNumber(_ context.Context, _ uuid.UUID, _ string, _ bool) (*domain.Contact, error) {
	return nil, nil
}
func (m *mockContactRepo) FindByLID(_ context.Context, _ uuid.UUID, _ string, _ bool) (*domain.Contact, error) {
	return nil, nil
}
func (m *mockContactRepo) Find(_ context.Context, _ uuid.UUID, _ string) ([]domain.Contact, error) {
	return nil, nil
}
func (m *mockContactRepo) Create(_ context.Context, _ *domain.Contact) error { return nil }
func (m *mockContactRepo) Update(_ context.Context, _ *domain.Contact, _ map[string]interface{}) error {
	return nil
}
func (m *mockContactRepo) Delete(_ context.Context, _ int, _ uuid.UUID) error { return nil }
func (m *mockContactRepo) FindOrCreate(_ context.Context, _ uuid.UUID, _, _, _ string, _, _ bool, _ string) (*domain.Contact, error) {
	return nil, nil
}

type mockUserQueueRepo struct {
	users     []domain.User
	inQueue   bool
	usersErr  error
	inQueueErr error
}

func (m *mockUserQueueRepo) IsUserInQueue(_ context.Context, _ int, _ int) (bool, error) {
	return m.inQueue, m.inQueueErr
}
func (m *mockUserQueueRepo) FindQueueUsers(_ context.Context, _ int, _ uuid.UUID) ([]domain.User, error) {
	return m.users, m.usersErr
}

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
	return NewDistributeTicketUseCase(tr, qr, eb, &mockContactRepo{}, &mockUserQueueRepo{})
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

// =====================================================================
// DB-backed Execute tests (PostgreSQL real via testutil)
// =====================================================================

func setupDistributeTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

// newUCWithDB creates a DistributeTicketUseCase with mock ticket/queue repos
// but real GORM repos for contact and user-queue (DB-backed).
func newUCWithDB(tr *mockTicketRepo, qr *mockQueueRepo, eb *mockEventBus, db *gorm.DB) *DistributeTicketUseCase {
	contactRepo := repository.NewGORMContactRepo(db)
	userQueueRepo := repository.NewGormUserQueueRepository(db)
	return NewDistributeTicketUseCase(tr, qr, eb, contactRepo, userQueueRepo)
}

// --- Execute with AUTO_ROUND_ROBIN ---

func TestExecute_RoundRobin_AssignsTicket(t *testing.T) {
	db := setupDistributeTestDB(t)
	tenantID := uuid.New()
	queueID := 3

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`, "User1", "u1@t.com", "x", tenantID.String())
	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`, "User2", "u2@t.com", "x", tenantID.String())
	db.Exec(`INSERT INTO "user_queues" ("userId", "queueId") VALUES (?, ?)`, 1, queueID)
	db.Exec(`INSERT INTO "user_queues" ("userId", "queueId") VALUES (?, ?)`, 2, queueID)

	ticket := &domain.Ticket{ID: 99, ContactID: 1}
	queue := &domain.Queue{ID: queueID, DistributionStrategy: "AUTO_ROUND_ROBIN"}
	tr := &mockTicketRepo{ticket: ticket}
	qr := &mockQueueRepo{queue: queue}
	eb := &mockEventBus{}

	uc := newUCWithDB(tr, qr, eb, db)
	err := uc.Execute(context.Background(), 99, queueID, tenantID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !tr.updated {
		t.Fatal("expected ticket to be updated (assigned)")
	}
	if len(eb.published) != 1 {
		t.Fatalf("expected 1 event published, got %d", len(eb.published))
	}
}

func TestExecute_Balanced_AssignsTicket(t *testing.T) {
	db := setupDistributeTestDB(t)
	tenantID := uuid.New()
	queueID := 4

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`, "UserA", "ua@t.com", "x", tenantID.String())
	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`, "UserB", "ub@t.com", "x", tenantID.String())
	db.Exec(`INSERT INTO "user_queues" ("userId", "queueId") VALUES (?, ?)`, 1, queueID)
	db.Exec(`INSERT INTO "user_queues" ("userId", "queueId") VALUES (?, ?)`, 2, queueID)

	ticket := &domain.Ticket{ID: 100, ContactID: 1}
	queue := &domain.Queue{ID: queueID, DistributionStrategy: "AUTO_BALANCED"}
	tr := &mockTicketRepo{ticket: ticket}
	qr := &mockQueueRepo{queue: queue}
	eb := &mockEventBus{}

	uc := newUCWithDB(tr, qr, eb, db)
	err := uc.Execute(context.Background(), 100, queueID, tenantID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !tr.updated {
		t.Fatal("expected ticket to be updated (assigned)")
	}
}

// --- Execute: uncovered branches ---

// TestExecute_RoundRobin_UpdateError covers assignTicket returning an error from ticketRepo.Update.
func TestExecute_RoundRobin_UpdateError(t *testing.T) {
	db := setupDistributeTestDB(t)
	tenantID := uuid.New()
	queueID := 5

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`, "UserX", "ux@t.com", "x", tenantID.String())
	db.Exec(`INSERT INTO "user_queues" ("userId", "queueId") VALUES (?, ?)`, 1, queueID)

	ticket := &domain.Ticket{ID: 55, ContactID: 1}
	queue := &domain.Queue{ID: queueID, DistributionStrategy: "AUTO_ROUND_ROBIN"}
	tr := &mockTicketRepo{ticket: ticket, updateErr: errors.New("update failed")}
	qr := &mockQueueRepo{queue: queue}
	eb := &mockEventBus{}

	uc := newUCWithDB(tr, qr, eb, db)
	err := uc.Execute(context.Background(), 55, queueID, tenantID)
	if err == nil {
		t.Fatal("expected error when ticketRepo.Update fails")
	}
}

// TestExecute_RoundRobin_EmptyQueue covers the no-users path for AUTO strategies.
func TestExecute_RoundRobin_EmptyQueue(t *testing.T) {
	db := setupDistributeTestDB(t)
	tenantID := uuid.New()
	queueID := 6

	// No users associated with this queue
	ticket := &domain.Ticket{ID: 77, ContactID: 1}
	queue := &domain.Queue{ID: queueID, DistributionStrategy: "AUTO_ROUND_ROBIN"}
	tr := &mockTicketRepo{ticket: ticket}
	qr := &mockQueueRepo{queue: queue}
	eb := &mockEventBus{}

	uc := newUCWithDB(tr, qr, eb, db)
	err := uc.Execute(context.Background(), 77, queueID, tenantID)
	if err != nil {
		t.Fatalf("empty queue should return nil, got %v", err)
	}
	if tr.updated {
		t.Error("ticket should not be updated when no users in queue")
	}
}

// TestExecute_UnknownStrategy_WithDB covers the default: return nil branch inside the switch.
func TestExecute_UnknownStrategy_WithDB(t *testing.T) {
	db := setupDistributeTestDB(t)
	tenantID := uuid.New()
	queueID := 9

	// Provide a user in the queue so we reach the switch statement
	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`, "UserZ", "uz@t.com", "x", tenantID.String())
	db.Exec(`INSERT INTO "user_queues" ("userId", "queueId") VALUES (?, ?)`, 1, queueID)

	ticket := &domain.Ticket{ID: 88, ContactID: 1}
	queue := &domain.Queue{ID: queueID, DistributionStrategy: "UNKNOWN_STRATEGY"}
	tr := &mockTicketRepo{ticket: ticket}
	qr := &mockQueueRepo{queue: queue}
	eb := &mockEventBus{}

	uc := newUCWithDB(tr, qr, eb, db)
	err := uc.Execute(context.Background(), 88, queueID, tenantID)
	if err != nil {
		t.Fatalf("unknown strategy should return nil, got %v", err)
	}
	if tr.updated {
		t.Error("ticket should not be updated for unknown strategy")
	}
}
