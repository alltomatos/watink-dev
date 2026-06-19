package services

import (
	"testing"

	amqp "github.com/streadway/amqp"
)

func TestGetRetryCount_NilHeaders(t *testing.T) {
	d := amqp.Delivery{Headers: nil}
	if got := getRetryCount(d); got != 0 {
		t.Errorf("want 0, got %d", got)
	}
}

func TestGetRetryCount_MissingKey(t *testing.T) {
	d := amqp.Delivery{Headers: amqp.Table{"other-key": "value"}}
	if got := getRetryCount(d); got != 0 {
		t.Errorf("want 0, got %d", got)
	}
}

func TestGetRetryCount_ValidCount(t *testing.T) {
	d := amqp.Delivery{Headers: amqp.Table{"x-retry-count": int32(2)}}
	if got := getRetryCount(d); got != 2 {
		t.Errorf("want 2, got %d", got)
	}
}

func TestGetRetryCount_WrongType(t *testing.T) {
	d := amqp.Delivery{Headers: amqp.Table{"x-retry-count": "not-an-int"}}
	if got := getRetryCount(d); got != 0 {
		t.Errorf("want 0 for wrong type, got %d", got)
	}
}

func TestGetRetryCount_MaxRetries(t *testing.T) {
	d := amqp.Delivery{Headers: amqp.Table{"x-retry-count": int32(dlqMaxRetries)}}
	if got := getRetryCount(d); got != dlqMaxRetries {
		t.Errorf("want %d, got %d", dlqMaxRetries, got)
	}
}
