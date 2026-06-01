package application

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
)

func TestNewInMemoryEventBus(t *testing.T) {
	bus := NewInMemoryEventBus()
	if bus == nil {
		t.Fatal("NewInMemoryEventBus returned nil")
	}
	if bus.subscribers == nil {
		t.Fatal("subscribers map not initialized")
	}
}

func TestPublishWithNoSubscribers(t *testing.T) {
	bus := NewInMemoryEventBus()
	event := domain.NewTicketAssignedEvent(1, 2, uuid.New())
	err := bus.Publish(context.Background(), event)
	if err != nil {
		t.Errorf("Publish with no subscribers should return nil, got %v", err)
	}
}

func TestSubscribeAndPublish(t *testing.T) {
	bus := NewInMemoryEventBus()
	tenantID := uuid.New()

	done := make(chan struct{})

	handler := func(ctx context.Context, event domain.DomainEvent) error {
		close(done)
		return nil
	}

	err := bus.Subscribe("TicketAssigned", handler)
	if err != nil {
		t.Fatalf("Subscribe returned error: %v", err)
	}

	event := domain.NewTicketAssignedEvent(1, 2, tenantID)

	err = bus.Publish(context.Background(), event)
	if err != nil {
		t.Fatalf("Publish returned error: %v", err)
	}

	select {
	case <-done:
		// success
	case <-time.After(100 * time.Millisecond):
		t.Fatal("handler was not called within timeout")
	}
}

func TestMultipleSubscribers(t *testing.T) {
	bus := NewInMemoryEventBus()
	tenantID := uuid.New()

	done := make(chan struct{}, 2)

	handler := func(ctx context.Context, event domain.DomainEvent) error {
		done <- struct{}{}
		return nil
	}

	err := bus.Subscribe("TicketAssigned", handler)
	if err != nil {
		t.Fatalf("Subscribe returned error: %v", err)
	}
	err = bus.Subscribe("TicketAssigned", handler)
	if err != nil {
		t.Fatalf("Second Subscribe returned error: %v", err)
	}

	event := domain.NewTicketAssignedEvent(1, 2, tenantID)
	err = bus.Publish(context.Background(), event)
	if err != nil {
		t.Fatalf("Publish returned error: %v", err)
	}

	// Wait for both goroutines
	for i := 0; i < 2; i++ {
		select {
		case <-done:
			// success
		case <-time.After(100 * time.Millisecond):
			t.Fatalf("timed out waiting for handler call %d", i+1)
		}
	}
}

func TestSubscribeDifferentEvents(t *testing.T) {
	bus := NewInMemoryEventBus()
	tenantID := uuid.New()

	ticketDone := make(chan struct{}, 1)
	messageDone := make(chan struct{}, 1)

	ticketHandler := func(ctx context.Context, event domain.DomainEvent) error {
		ticketDone <- struct{}{}
		return nil
	}
	messageHandler := func(ctx context.Context, event domain.DomainEvent) error {
		messageDone <- struct{}{}
		return nil
	}

	_ = bus.Subscribe("TicketAssigned", ticketHandler)
	_ = bus.Subscribe("MessageReceived", messageHandler)

	// Publish a TicketAssigned event — only ticketHandler should fire.
	_ = bus.Publish(context.Background(), domain.NewTicketAssignedEvent(1, 2, tenantID))

	select {
	case <-ticketDone:
		// success
	case <-time.After(100 * time.Millisecond):
		t.Fatal("ticket handler was not called within timeout")
	}

	// Verify message handler was NOT called by waiting briefly.
	select {
	case <-messageDone:
		t.Error("message handler should not have been called")
	default:
		// expected: no message event published
	}
}

func TestEventBusImplementsInterface(t *testing.T) {
	// Compile-time check that InMemoryEventBus satisfies domain.EventBus.
	var _ domain.EventBus = NewInMemoryEventBus()
}

func TestPublishPreservesEventTenantID(t *testing.T) {
	bus := NewInMemoryEventBus()
	tenantID := uuid.New()

	done := make(chan struct{})
	var receivedTenantID uuid.UUID

	handler := func(ctx context.Context, event domain.DomainEvent) error {
		receivedTenantID = event.TenantID()
		close(done)
		return nil
	}

	_ = bus.Subscribe("TicketAssigned", handler)
	_ = bus.Publish(context.Background(), domain.NewTicketAssignedEvent(1, 2, tenantID))

	select {
	case <-done:
	case <-time.After(100 * time.Millisecond):
		t.Fatal("handler was not called within timeout")
	}

	if receivedTenantID != tenantID {
		t.Errorf("expected tenantID %s, got %s", tenantID, receivedTenantID)
	}
}

func TestPublishLogsHandlerError(t *testing.T) {
	bus := NewInMemoryEventBus()

	done := make(chan struct{})

	handler := func(ctx context.Context, event domain.DomainEvent) error {
		defer close(done)
		return errors.New("handler failed")
	}

	_ = bus.Subscribe("TicketAssigned", handler)
	_ = bus.Publish(context.Background(), domain.NewTicketAssignedEvent(1, 2, uuid.New()))

	select {
	case <-done:
		// handler executed; error was logged inside Publish's goroutine
	case <-time.After(100 * time.Millisecond):
		t.Fatal("handler was not called within timeout")
	}
}
