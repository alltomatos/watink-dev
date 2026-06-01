package application

import (
	"context"
	"log"
	"sync"

	"github.com/alltomatos/watinkdev/business/internal/domain"
)

// InMemoryEventBus implements domain.EventBus interface for in-process decoupling.
type InMemoryEventBus struct {
	mu          sync.RWMutex
	subscribers map[string][]domain.EventHandler
}

// NewInMemoryEventBus creates a new instance of InMemoryEventBus.
func NewInMemoryEventBus() *InMemoryEventBus {
	return &InMemoryEventBus{
		subscribers: make(map[string][]domain.EventHandler),
	}
}

// Publish dispatches a domain event to all registered subscribers asynchronously.
func (b *InMemoryEventBus) Publish(ctx context.Context, event domain.DomainEvent) error {
	b.mu.RLock()
	handlers, ok := b.subscribers[event.EventName()]
	b.mu.RUnlock()

	if !ok {
		return nil
	}

	for _, handler := range handlers {
		go func(h domain.EventHandler) {
			if err := h(ctx, event); err != nil {
				log.Printf("eventbus: handler error for event %q: %v", event.EventName(), err)
			}
		}(handler)
	}

	return nil
}

// Subscribe registers a handler for a specific event name.
func (b *InMemoryEventBus) Subscribe(eventName string, handler domain.EventHandler) error {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.subscribers[eventName] = append(b.subscribers[eventName], handler)
	return nil
}
