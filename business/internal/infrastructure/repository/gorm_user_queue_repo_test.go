package repository_test

import (
	"context"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/infrastructure/repository"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
)

func TestUserQueueRepo_IsUserInQueue_True(t *testing.T) {
	db := testutil.NewTestDB(t)
	db.Exec(`INSERT INTO "user_queues" (user_id, queue_id) VALUES (?, ?)`, 1, 10)

	repo := repository.NewGormUserQueueRepository(db)
	inQueue, err := repo.IsUserInQueue(context.Background(), 1, 10)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if !inQueue {
		t.Fatal("expected user to be in queue")
	}
}

func TestUserQueueRepo_IsUserInQueue_False(t *testing.T) {
	db := testutil.NewTestDB(t)

	repo := repository.NewGormUserQueueRepository(db)
	inQueue, err := repo.IsUserInQueue(context.Background(), 1, 10)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if inQueue {
		t.Fatal("expected user NOT to be in queue")
	}
}

func TestUserQueueRepo_FindQueueUsers_ReturnsTwoUsers(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`, "Ana", "ana@test.com", "x", tenantID.String())
	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`, "Beto", "beto@test.com", "x", tenantID.String())
	db.Exec(`INSERT INTO "user_queues" (user_id, queue_id) VALUES (?, ?)`, 1, 5)
	db.Exec(`INSERT INTO "user_queues" (user_id, queue_id) VALUES (?, ?)`, 2, 5)

	repo := repository.NewGormUserQueueRepository(db)
	users, err := repo.FindQueueUsers(context.Background(), 5, tenantID)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(users) != 2 {
		t.Fatalf("expected 2 users, got %d", len(users))
	}
}

func TestUserQueueRepo_FindQueueUsers_EmptyQueue(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantID := uuid.New()

	repo := repository.NewGormUserQueueRepository(db)
	users, err := repo.FindQueueUsers(context.Background(), 99, tenantID)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(users) != 0 {
		t.Fatalf("expected 0 users, got %d", len(users))
	}
}

func TestUserQueueRepo_FindQueueUsers_IsolatesByTenant(t *testing.T) {
	db := testutil.NewTestDB(t)
	tenantA := uuid.New()
	tenantB := uuid.New()

	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`, "UserA", "ua@test.com", "x", tenantA.String())
	db.Exec(`INSERT INTO "Users" (name, email, "passwordHash", "tenantId") VALUES (?, ?, ?, ?)`, "UserB", "ub@test.com", "x", tenantB.String())
	db.Exec(`INSERT INTO "user_queues" (user_id, queue_id) VALUES (?, ?)`, 1, 7)
	db.Exec(`INSERT INTO "user_queues" (user_id, queue_id) VALUES (?, ?)`, 2, 7)

	repo := repository.NewGormUserQueueRepository(db)
	users, err := repo.FindQueueUsers(context.Background(), 7, tenantA)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(users) != 1 {
		t.Fatalf("expected 1 user for tenantA, got %d", len(users))
	}
}
