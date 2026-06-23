package rabbitmq

import (
	"os"
	"testing"
)

func TestPublishEvent_MarshalError(t *testing.T) {
	// A channel value cannot be JSON-marshalled.
	s := &RabbitMQService{}
	err := s.PublishEvent("test.key", make(chan struct{}))
	if err == nil {
		t.Fatal("expected marshal error, got nil")
	}
}

func TestRabbitMQService_NewReadsEnvVar(t *testing.T) {
	const want = "amqp://user:pass@myhost:5672/"
	t.Setenv("AMQP_URL", want)

	svc := NewRabbitMQService()
	if svc.url != want {
		t.Fatalf("url = %q, want %q", svc.url, want)
	}
}

func TestRabbitMQService_NewDefaultURL(t *testing.T) {
	const defaultURL = "amqp://guest:guest@localhost:5672/"

	// Ensure env var is absent for this test.
	t.Cleanup(func() { os.Unsetenv("AMQP_URL") })
	os.Unsetenv("AMQP_URL")

	svc := NewRabbitMQService()
	if svc.url != defaultURL {
		t.Fatalf("url = %q, want %q", svc.url, defaultURL)
	}
}

func TestClose_NilConnAndChannel(t *testing.T) {
	s := &RabbitMQService{}
	if err := s.Close(); err != nil {
		t.Fatalf("Close on zero-value service returned error: %v", err)
	}
}
