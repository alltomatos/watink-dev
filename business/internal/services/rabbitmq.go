package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/streadway/amqp"
	"go.opentelemetry.io/otel"
)

const (
	dlqExchange    = "wbot.dlq"
	dlqMaxRetries  = 3
	dlqBaseBackoff = 5 * time.Second
	dlqMaxBackoff  = 5 * time.Minute
	dlqMessageTTL  = 86400000 // 24h in ms
)

type RabbitMQService struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	url     string
}

func NewRabbitMQService() *RabbitMQService {
	url := os.Getenv("AMQP_URL")
	if url == "" {
		url = "amqp://localhost:5672"
	}
	return &RabbitMQService{
		url: url,
	}
}

func (s *RabbitMQService) Connect() error {
	var err error
	s.conn, err = amqp.Dial(s.url)
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %v", err)
	}

	go func() {
		<-s.conn.NotifyClose(make(chan *amqp.Error))
		log.Println("[RabbitMQ] Connection closed. Reconnecting...")
		time.Sleep(5 * time.Second)
		s.Connect()
	}()

	s.channel, err = s.conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to open a channel: %v", err)
	}

	if err := s.channel.Qos(10, 0, false); err != nil {
		log.Printf("[RabbitMQ] Warning: failed to set QoS prefetch: %v", err)
	}

	if err := s.setupExchanges(); err != nil {
		return fmt.Errorf("failed to setup exchanges: %v", err)
	}

	log.Println("[RabbitMQ] Connected successfully")
	return nil
}

func (s *RabbitMQService) setupExchanges() error {
	exchanges := []struct {
		name string
		kind string
	}{
		{"wbot.commands", "topic"},
		{"wbot.events", "topic"},
		{dlqExchange, "topic"},
		{"api.events", "topic"},
	}
	for _, ex := range exchanges {
		if err := s.channel.ExchangeDeclare(
			ex.name, ex.kind, true, false, false, false, nil,
		); err != nil {
			return fmt.Errorf("exchange %s: %v", ex.name, err)
		}
	}
	return nil
}

func (s *RabbitMQService) PublishCommand(routingKey string, payload interface{}) error {
	return s.publishWithTrace("wbot.commands", routingKey, payload)
}

func (s *RabbitMQService) PublishEvent(routingKey string, payload interface{}) error {
	return s.publishWithTrace("wbot.events", routingKey, payload)
}

func (s *RabbitMQService) publishWithTrace(exchange, routingKey string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	headers := amqp.Table{}
	// Inject current trace context into AMQP headers for distributed tracing
	otel.GetTextMapPropagator().Inject(context.Background(), &amqpHeaderCarrier{headers: headers})

	log.Printf("[RabbitMQ] Publishing to %s/%s", exchange, routingKey)
	return s.channel.Publish(
		exchange, routingKey, false, false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Body:         body,
			Timestamp:    time.Now(),
			Headers:      headers,
		},
	)
}

func (s *RabbitMQService) ConsumeEvents(queueName string, routingKeys []string, handler func(amqp.Delivery) error) error {
	if err := s.declareQueueWithDLQ(queueName, "wbot.events", routingKeys); err != nil {
		return err
	}

	msgs, err := s.channel.Consume(queueName, "", false, false, false, false, nil)
	if err != nil {
		return err
	}

	go func() {
		for d := range msgs {
			if err := handler(d); err != nil {
				s.handleFailedMessage(d, err)
			} else {
				d.Ack(false)
			}
		}
	}()

	return nil
}

func (s *RabbitMQService) declareQueueWithDLQ(queueName, exchange string, routingKeys []string) error {
	dlqQueueName := queueName + ".dlq"

	// Declare DLQ queue (messages that exceeded max retries)
	if _, err := s.channel.QueueDeclare(
		dlqQueueName, true, false, false, false, nil,
	); err != nil {
		return fmt.Errorf("DLQ queue %s: %v", dlqQueueName, err)
	}

	if err := s.channel.QueueBind(dlqQueueName, "#", dlqExchange, false, nil); err != nil {
		return fmt.Errorf("DLQ bind %s: %v", dlqQueueName, err)
	}

	// Declare main queue with DLQ routing
	args := amqp.Table{
		"x-dead-letter-exchange":    dlqExchange,
		"x-dead-letter-routing-key": queueName,
		"x-message-ttl":             int32(dlqMessageTTL),
	}

	if _, err := s.channel.QueueDeclare(
		queueName, true, false, false, false, args,
	); err != nil {
		return fmt.Errorf("queue %s: %v", queueName, err)
	}

	for _, key := range routingKeys {
		if err := s.channel.QueueBind(queueName, key, exchange, false, nil); err != nil {
			return fmt.Errorf("bind %s -> %s: %v", key, queueName, err)
		}
	}

	return nil
}

func (s *RabbitMQService) handleFailedMessage(d amqp.Delivery, processErr error) {
	retryCount := getRetryCount(d)

	log.Printf("[RabbitMQ] Message failed (retry %d/%d): %v", retryCount, dlqMaxRetries, processErr)

	if retryCount >= dlqMaxRetries {
		log.Printf("[RabbitMQ] Max retries exceeded, routing to DLQ: %s", d.MessageId)
		d.Nack(false, false) // reject without requeue -> goes to DLQ
		return
	}

	// Exponential backoff: base * 2^retryCount, capped at max
	backoff := dlqBaseBackoff * time.Duration(1<<uint(retryCount))
	if backoff > dlqMaxBackoff {
		backoff = dlqMaxBackoff
	}

	log.Printf("[RabbitMQ] Requeuing with %v backoff (retry %d)", backoff, retryCount+1)
	time.Sleep(backoff)

	// Re-publish with incremented retry header
	headers := amqp.Table{}
	if d.Headers != nil {
		for k, v := range d.Headers {
			headers[k] = v
		}
	}
	headers["x-retry-count"] = int32(retryCount + 1)

	exchange := d.Exchange
	if exchange == "" {
		exchange = "wbot.events"
	}

	err := s.channel.Publish(
		exchange, d.RoutingKey, false, false,
		amqp.Publishing{
			ContentType:  d.ContentType,
			DeliveryMode: amqp.Persistent,
			Body:         d.Body,
			Headers:      headers,
			Timestamp:    time.Now(),
		},
	)
	if err != nil {
		log.Printf("[RabbitMQ] Failed to requeue message: %v", err)
		d.Nack(false, false)
		return
	}

	d.Ack(false) // ack original, re-published copy carries retry header
}

func getRetryCount(d amqp.Delivery) int {
	if d.Headers == nil {
		return 0
	}
	if count, ok := d.Headers["x-retry-count"].(int32); ok {
		return int(count)
	}
	return 0
}

func (s *RabbitMQService) Close() error {
	if s.channel != nil {
		s.channel.Close()
	}
	if s.conn != nil {
		return s.conn.Close()
	}
	return nil
}

// extractTraceContext creates a context with trace info from AMQP delivery headers
func extractTraceContext(d amqp.Delivery) context.Context {
	carrier := &amqpHeaderCarrier{headers: d.Headers}
	return otel.GetTextMapPropagator().Extract(context.Background(), carrier)
}

// amqpHeaderCarrier implements propagation.TextMapCarrier for AMQP headers
type amqpHeaderCarrier struct {
	headers amqp.Table
}

func (c *amqpHeaderCarrier) Get(key string) string {
	if c.headers == nil {
		return ""
	}
	v, ok := c.headers[key]
	if !ok {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return ""
	}
	return s
}

func (c *amqpHeaderCarrier) Set(key, value string) {
	if c.headers == nil {
		c.headers = amqp.Table{}
	}
	c.headers[key] = value
}

func (c *amqpHeaderCarrier) Keys() []string {
	keys := make([]string, 0, len(c.headers))
	for k := range c.headers {
		keys = append(keys, k)
	}
	return keys
}
