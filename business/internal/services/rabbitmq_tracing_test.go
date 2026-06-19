package services

import (
	"testing"

	amqp "github.com/streadway/amqp"
)

func TestAmqpHeaderCarrier_GetNilHeaders(t *testing.T) {
	c := &amqpHeaderCarrier{headers: nil}
	if got := c.Get("traceparent"); got != "" {
		t.Errorf("want empty string, got %q", got)
	}
}

func TestAmqpHeaderCarrier_GetMissingKey(t *testing.T) {
	c := &amqpHeaderCarrier{headers: amqp.Table{"other": "val"}}
	if got := c.Get("traceparent"); got != "" {
		t.Errorf("want empty string for missing key, got %q", got)
	}
}

func TestAmqpHeaderCarrier_GetWrongType(t *testing.T) {
	c := &amqpHeaderCarrier{headers: amqp.Table{"traceparent": 42}}
	if got := c.Get("traceparent"); got != "" {
		t.Errorf("want empty string for non-string value, got %q", got)
	}
}

func TestAmqpHeaderCarrier_GetValidString(t *testing.T) {
	c := &amqpHeaderCarrier{headers: amqp.Table{"traceparent": "00-abc-def-01"}}
	if got := c.Get("traceparent"); got != "00-abc-def-01" {
		t.Errorf("want %q, got %q", "00-abc-def-01", got)
	}
}

func TestAmqpHeaderCarrier_SetInitializesNilMap(t *testing.T) {
	c := &amqpHeaderCarrier{headers: nil}
	c.Set("traceparent", "00-abc-def-01")
	if got := c.Get("traceparent"); got != "00-abc-def-01" {
		t.Errorf("want %q after Set on nil headers, got %q", "00-abc-def-01", got)
	}
}

func TestAmqpHeaderCarrier_Keys(t *testing.T) {
	c := &amqpHeaderCarrier{headers: amqp.Table{"a": "1", "b": "2"}}
	keys := c.Keys()
	if len(keys) != 2 {
		t.Errorf("want 2 keys, got %d", len(keys))
	}
}

func TestAmqpHeaderCarrier_KeysEmpty(t *testing.T) {
	c := &amqpHeaderCarrier{headers: amqp.Table{}}
	if keys := c.Keys(); len(keys) != 0 {
		t.Errorf("want 0 keys, got %d", len(keys))
	}
}
