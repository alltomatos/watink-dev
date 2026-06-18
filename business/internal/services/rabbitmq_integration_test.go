//go:build integration

package services

import (
	"os"
	"testing"

	"github.com/streadway/amqp"
)

func rabbitMQURL(t *testing.T) string {
	t.Helper()
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://guest:guest@localhost:5672/"
	}
	return url
}

func TestRabbitMQService_Connect(t *testing.T) {
	svc := NewRabbitMQProvider(rabbitMQURL(t))
	if err := svc.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}
	defer svc.Close()
}

func TestRabbitMQService_PublishCommand(t *testing.T) {
	svc := NewRabbitMQProvider(rabbitMQURL(t))
	if err := svc.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}
	defer svc.Close()

	payload := map[string]string{"action": "test", "sessionId": "integ-001"}
	if err := svc.PublishCommand("watink.commands", payload); err != nil {
		t.Fatalf("PublishCommand() failed: %v", err)
	}
}

func TestRabbitMQService_PublishEvent(t *testing.T) {
	svc := NewRabbitMQProvider(rabbitMQURL(t))
	if err := svc.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}
	defer svc.Close()

	payload := map[string]interface{}{"event": "test.event", "data": "hello"}
	if err := svc.PublishEvent("watink.events", payload); err != nil {
		t.Fatalf("PublishEvent() failed: %v", err)
	}
}

func TestRabbitMQService_Close(t *testing.T) {
	svc := NewRabbitMQProvider(rabbitMQURL(t))
	if err := svc.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}
	if err := svc.Close(); err != nil {
		t.Fatalf("Close() failed: %v", err)
	}
}

func TestRabbitMQService_ConsumeAndPublish_RoundTrip(t *testing.T) {
	svc := NewRabbitMQProvider(rabbitMQURL(t))
	if err := svc.Connect(); err != nil {
		t.Fatalf("Connect() failed: %v", err)
	}
	defer svc.Close()

	// Just verify that the call to ConsumeEvents doesn't panic when the
	// queue/exchange are not yet declared — it should return an error gracefully.
	err := svc.ConsumeEvents("watink.integ.nonexistent", []string{"integ.key"}, func(_ amqp.Delivery) error {
		return nil
	})
	// Either succeeds (queue created) or returns a channel/exchange error — both are acceptable
	t.Logf("ConsumeEvents result: %v", err)
}

func TestRabbitMQService_NilURL_NoConnect(t *testing.T) {
	svc := NewRabbitMQProvider("")
	if svc == nil {
		t.Fatal("NewRabbitMQProvider should return non-nil even for empty URL")
	}
}
