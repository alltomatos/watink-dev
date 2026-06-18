package services

import (
	"testing"
)

func TestParseQueueList_Empty(t *testing.T) {
	queues := ParseQueueList("")
	if len(queues) != 2 {
		t.Fatalf("expected 2 default queues, got %d", len(queues))
	}
	if queues[0] != "api.events.process.go" {
		t.Fatalf("first default queue: got %q", queues[0])
	}
	if queues[1] != "flow.worker.queue" {
		t.Fatalf("second default queue: got %q", queues[1])
	}
}

func TestParseQueueList_Whitespace(t *testing.T) {
	queues := ParseQueueList("   ")
	if len(queues) != 2 {
		t.Fatalf("expected 2 default queues for whitespace input, got %d", len(queues))
	}
}

func TestParseQueueList_Single(t *testing.T) {
	queues := ParseQueueList("my.queue")
	if len(queues) != 1 || queues[0] != "my.queue" {
		t.Fatalf("unexpected: %v", queues)
	}
}

func TestParseQueueList_Multiple(t *testing.T) {
	queues := ParseQueueList("q1, q2 , q3")
	if len(queues) != 3 {
		t.Fatalf("expected 3 queues, got %d: %v", len(queues), queues)
	}
	if queues[0] != "q1" || queues[1] != "q2" || queues[2] != "q3" {
		t.Fatalf("unexpected queue names: %v", queues)
	}
}

func TestParseQueueList_AllCommas(t *testing.T) {
	queues := ParseQueueList(",,,")
	if len(queues) != 2 {
		t.Fatalf("expected defaults when all entries are empty, got %d: %v", len(queues), queues)
	}
}

func TestDeriveManagementURL_Empty(t *testing.T) {
	if got := deriveManagementURL(""); got != "" {
		t.Fatalf("expected empty string for empty input, got %q", got)
	}
}

func TestDeriveManagementURL_ValidAMQP(t *testing.T) {
	got := deriveManagementURL("amqp://guest:guest@localhost:5672/")
	want := "http://localhost:15672/api/queues"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestDeriveManagementURL_CustomHost(t *testing.T) {
	got := deriveManagementURL("amqp://user:pass@rabbitmq.internal:5672/vhost")
	want := "http://rabbitmq.internal:15672/api/queues"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestDeriveManagementURL_Invalid(t *testing.T) {
	got := deriveManagementURL("://bad-url")
	if got != "" {
		t.Fatalf("expected empty string for invalid URL, got %q", got)
	}
}

func TestRabbitMQService_IsConnected_NilService(t *testing.T) {
	var s *RabbitMQService
	if s.IsConnected() {
		t.Fatal("nil RabbitMQService must return IsConnected=false")
	}
}

func TestRabbitMQService_IsConnected_NilConn(t *testing.T) {
	s := &RabbitMQService{conn: nil}
	if s.IsConnected() {
		t.Fatal("RabbitMQService with nil conn must return IsConnected=false")
	}
}

func TestRabbitMQService_InspectQueue_NotConnected(t *testing.T) {
	s := &RabbitMQService{conn: nil}
	m := s.InspectQueue("test.queue")
	if m.Error != "not_connected" {
		t.Fatalf("expected error=not_connected, got %q", m.Error)
	}
	if m.Name != "test.queue" {
		t.Fatalf("expected name=test.queue, got %q", m.Name)
	}
}
