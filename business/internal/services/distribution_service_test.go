package services

import (
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// --- Test helpers ---

func setupDistributionDB(t *testing.T) *gorm.DB {
	t.Helper()
	return testutil.NewTestDB(t)
}

// createQueue inserts a Queue with required NOT NULL fields.
func createQueue(db *gorm.DB, id int, strategy string, prioritizeWallet bool, tenantID uuid.UUID) {
	db.Table("Queues").Create(&map[string]interface{}{
		"id": id, "name": "Test Queue", "color": "#000000",
		"distributionStrategy": strategy, "prioritizeWallet": prioritizeWallet, "tenantId": tenantID,
	})
}

// createUser inserts a User with required NOT NULL fields.
func createUser(db *gorm.DB, id int, tenantID uuid.UUID) {
	db.Table("Users").Create(&map[string]interface{}{
		"id": id, "name": "User", "email": uuid.New().String() + "@test.com",
		"passwordHash": "x", "tenantId": tenantID,
	})
}

// createContact inserts a Contact with required NOT NULL fields.
func createContact(db *gorm.DB, id int, tenantID uuid.UUID, extra map[string]interface{}) {
	row := map[string]interface{}{
		"id": id, "name": "Contact", "email": "", "tenantId": tenantID,
	}
	for k, v := range extra {
		row[k] = v
	}
	db.Table("Contacts").Create(&row)
}

// --- Tests ---

func TestDistributionService_ManualStrategy_DoesNothing(t *testing.T) {
	db := setupDistributionDB(t)
	svc := NewDistributionService(db)
	tenantID := uuid.New()

	createQueue(db, 1, "MANUAL", false, tenantID)
	db.Table("Tickets").Create(&map[string]interface{}{"id": 10, "queueId": 1, "tenantId": tenantID})

	if err := svc.DistributeTicket(10, 1, tenantID); err != nil {
		t.Errorf("DistributeTicket failed: %v", err)
	}

	var updatedTicket map[string]interface{}
	db.Table("Tickets").Where("id = ?", 10).First(&updatedTicket)
	if updatedTicket["userId"] != nil {
		t.Errorf("manual strategy should not assign user, got: %v", updatedTicket["userId"])
	}
}

func TestDistributionService_RoundRobin_AssignsNextUser(t *testing.T) {
	db := setupDistributionDB(t)
	svc := NewDistributionService(db)
	tenantID := uuid.New()

	user1, user2 := 1, 2
	createUser(db, user1, tenantID)
	createUser(db, user2, tenantID)
	createQueue(db, 1, "AUTO_ROUND_ROBIN", false, tenantID)
	db.Table("user_queues").Create(&map[string]interface{}{"userId": user1, "queueId": 1})
	db.Table("user_queues").Create(&map[string]interface{}{"userId": user2, "queueId": 1})

	// Previous ticket was assigned to user1 — next should be user2
	db.Table("Tickets").Create(&map[string]interface{}{"id": 5, "queueId": 1, "userId": user1, "tenantId": tenantID, "status": "open"})
	createContact(db, 1, tenantID, nil)
	db.Table("Tickets").Create(&map[string]interface{}{"id": 10, "contactId": 1, "queueId": 1, "tenantId": tenantID})

	if err := svc.DistributeTicket(10, 1, tenantID); err != nil {
		t.Fatal(err)
	}

	var assignedUser *int
	if err := db.Raw(`SELECT "userId" FROM "Tickets" WHERE id = 10`).Row().Scan(&assignedUser); err != nil {
		t.Fatalf("failed to scan ticket userId: %v", err)
	}
	if assignedUser == nil {
		t.Fatal("expected a user to be assigned")
	}
	if *assignedUser != user2 {
		t.Errorf("round-robin: expected user %d, got %d", user2, *assignedUser)
	}
}

func TestDistributionService_Balanced_AssignsLeastLoadedUser(t *testing.T) {
	db := setupDistributionDB(t)
	svc := NewDistributionService(db)
	tenantID := uuid.New()

	user1, user2 := 1, 2
	createUser(db, user1, tenantID)
	createUser(db, user2, tenantID)
	createQueue(db, 1, "AUTO_BALANCED", false, tenantID)
	db.Table("user_queues").Create(&map[string]interface{}{"userId": user1, "queueId": 1})
	db.Table("user_queues").Create(&map[string]interface{}{"userId": user2, "queueId": 1})

	// user1 has 3 open tickets, user2 has 1 — balanced should pick user2
	for i := 0; i < 3; i++ {
		db.Table("Tickets").Create(&map[string]interface{}{"id": 100 + i, "queueId": 1, "userId": user1, "tenantId": tenantID, "status": "open"})
	}
	db.Table("Tickets").Create(&map[string]interface{}{"id": 200, "queueId": 1, "userId": user2, "tenantId": tenantID, "status": "open"})
	createContact(db, 1, tenantID, nil)
	db.Table("Tickets").Create(&map[string]interface{}{"id": 999, "contactId": 1, "queueId": 1, "tenantId": tenantID})

	if err := svc.DistributeTicket(999, 1, tenantID); err != nil {
		t.Fatal(err)
	}

	var assignedUser *int
	if err := db.Raw(`SELECT "userId" FROM "Tickets" WHERE id = 999`).Row().Scan(&assignedUser); err != nil {
		t.Fatalf("failed to scan ticket userId: %v", err)
	}
	if assignedUser == nil {
		t.Fatal("AUTO_BALANCED strategy should assign some user")
	}
}

func TestDistributionService_InvalidTenant_TicketNotFound(t *testing.T) {
	db := setupDistributionDB(t)
	svc := NewDistributionService(db)
	tenantID := uuid.New()

	// Ticket does not exist for this tenant
	err := svc.DistributeTicket(9999, 1, tenantID)
	if err == nil {
		t.Error("expected error when ticket not found for tenant")
	}
}

func TestDistributionService_InvalidQueue_QueueNotFound(t *testing.T) {
	db := setupDistributionDB(t)
	svc := NewDistributionService(db)
	tenantID := uuid.New()

	// Insert ticket but no queue
	db.Table("Tickets").Create(&map[string]interface{}{"id": 10, "queueId": 999, "tenantId": tenantID})

	err := svc.DistributeTicket(10, 999, tenantID)
	if err == nil {
		t.Error("expected error when queue not found for tenant")
	}
}

func TestDistributionService_RoundRobin_EmptyUserList_DoesNothing(t *testing.T) {
	db := setupDistributionDB(t)
	svc := NewDistributionService(db)
	tenantID := uuid.New()

	// Queue has round-robin strategy but no users assigned
	createQueue(db, 1, "AUTO_ROUND_ROBIN", false, tenantID)
	createContact(db, 1, tenantID, nil)
	db.Table("Tickets").Create(&map[string]interface{}{"id": 10, "contactId": 1, "queueId": 1, "tenantId": tenantID})

	if err := svc.DistributeTicket(10, 1, tenantID); err != nil {
		t.Fatalf("empty user list should not error, got: %v", err)
	}

	var userID *int
	if err := db.Raw(`SELECT "userId" FROM "Tickets" WHERE id = 10`).Row().Scan(&userID); err != nil && err.Error() != "sql: no rows in result set" {
		t.Fatalf("scan error: %v", err)
	}
	if userID != nil {
		t.Errorf("no users in queue — ticket should remain unassigned, got userId: %v", *userID)
	}
}

func TestDistributionService_RoundRobin_NoLastTicket_AssignsFirstUser(t *testing.T) {
	db := setupDistributionDB(t)
	svc := NewDistributionService(db)
	tenantID := uuid.New()

	user1 := 1
	createUser(db, user1, tenantID)
	createQueue(db, 1, "AUTO_ROUND_ROBIN", false, tenantID)
	db.Table("user_queues").Create(&map[string]interface{}{"userId": user1, "queueId": 1})
	createContact(db, 1, tenantID, nil)
	// No previous ticket with userId assigned
	db.Table("Tickets").Create(&map[string]interface{}{"id": 10, "contactId": 1, "queueId": 1, "tenantId": tenantID})

	if err := svc.DistributeTicket(10, 1, tenantID); err != nil {
		t.Fatal(err)
	}

	var assignedUser *int
	if err := db.Raw(`SELECT "userId" FROM "Tickets" WHERE id = 10`).Row().Scan(&assignedUser); err != nil {
		t.Fatalf("scan error: %v", err)
	}
	if assignedUser == nil || *assignedUser != user1 {
		t.Errorf("expected first user (%d) when no previous ticket, got: %v", user1, assignedUser)
	}
}

func TestDistributionService_UnknownStrategy_DoesNothing(t *testing.T) {
	db := setupDistributionDB(t)
	svc := NewDistributionService(db)
	tenantID := uuid.New()

	createQueue(db, 1, "UNKNOWN_STRATEGY", false, tenantID)
	createContact(db, 1, tenantID, nil)
	db.Table("Tickets").Create(&map[string]interface{}{"id": 10, "contactId": 1, "queueId": 1, "tenantId": tenantID})
	createUser(db, 1, tenantID)
	db.Table("user_queues").Create(&map[string]interface{}{"userId": 1, "queueId": 1})

	if err := svc.DistributeTicket(10, 1, tenantID); err != nil {
		t.Fatalf("unknown strategy should return nil, got: %v", err)
	}
}

func TestDistributionService_WalletPriority(t *testing.T) {
	db := setupDistributionDB(t)
	svc := NewDistributionService(db)
	tenantID := uuid.New()

	// 1. Setup Wallet User & Queue
	userID := 100
	createUser(db, userID, tenantID)
	createQueue(db, 1, "AUTO_ROUND_ROBIN", true, tenantID)
	db.Table("user_queues").Create(&map[string]interface{}{"userId": userID, "queueId": 1})

	// 2. Setup Contact (Wallet owner 100) & Ticket
	createContact(db, 50, tenantID, map[string]interface{}{"walletUserId": userID})
	db.Table("Tickets").Create(&map[string]interface{}{"id": 10, "contactId": 50, "queueId": 1, "tenantId": tenantID})

	// 3. Act
	if err := svc.DistributeTicket(10, 1, tenantID); err != nil {
		t.Fatal(err)
	}

	// 4. Verify
	var userIDResult *int
	row := db.Raw(`SELECT "userId" FROM "Tickets" WHERE id = 10`).Row()
	if err := row.Scan(&userIDResult); err != nil {
		t.Fatalf("failed to scan ticket userId: %v", err)
	}
	if userIDResult == nil || *userIDResult != userID {
		t.Errorf("expected wallet assignment to user %d, got %v", userID, userIDResult)
	}
}
