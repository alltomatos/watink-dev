package rabbitmq

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/streadway/amqp"
)

// RabbitMQService manages a single AMQP connection and channel for the engine-go.
// It exposes ConsumeCommands (wbot.commands exchange) and PublishEvent (wbot.events exchange).
type RabbitMQService struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	url     string
}

// NewRabbitMQService creates a service reading AMQP_URL from env (default: guest@localhost).
func NewRabbitMQService() *RabbitMQService {
	url := os.Getenv("AMQP_URL")
	if url == "" {
		url = "amqp://guest:guest@localhost:5672/"
	}
	return &RabbitMQService{url: url}
}

// Connect dials RabbitMQ, opens a channel, sets QoS and declares exchanges.
// On connection drop it schedules a reconnect in 5 s.
func (s *RabbitMQService) Connect() error {
	var err error
	s.conn, err = amqp.Dial(s.url)
	if err != nil {
		return fmt.Errorf("rabbitmq dial: %w", err)
	}

	go func() {
		<-s.conn.NotifyClose(make(chan *amqp.Error))
		log.Println("[RabbitMQ] connection closed, reconnecting in 5s...")
		time.Sleep(5 * time.Second)
		if err := s.Connect(); err != nil {
			log.Printf("[RabbitMQ] reconnect failed: %v", err)
		}
	}()

	s.channel, err = s.conn.Channel()
	if err != nil {
		return fmt.Errorf("rabbitmq channel: %w", err)
	}

	if err := s.channel.Qos(10, 0, false); err != nil {
		log.Printf("[RabbitMQ] QoS warning: %v", err)
	}

	for _, ex := range []string{"wbot.commands", "wbot.events"} {
		if err := s.channel.ExchangeDeclare(ex, "topic", true, false, false, false, nil); err != nil {
			return fmt.Errorf("exchange %s: %w", ex, err)
		}
	}

	log.Println("[RabbitMQ] connected")
	return nil
}

// ConsumeCommands declares a durable queue bound to wbot.commands with the given
// routing key patterns and starts a goroutine that calls handler for every delivery.
// The caller is responsible for Ack/Nack inside handler.
func (s *RabbitMQService) ConsumeCommands(queueName string, routingKeys []string, handler func(amqp.Delivery)) error {
	if _, err := s.channel.QueueDeclare(queueName, true, false, false, false, nil); err != nil {
		return fmt.Errorf("queue %s: %w", queueName, err)
	}

	for _, key := range routingKeys {
		if err := s.channel.QueueBind(queueName, key, "wbot.commands", false, nil); err != nil {
			return fmt.Errorf("bind %s: %w", key, err)
		}
	}

	msgs, err := s.channel.Consume(queueName, "", false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("consume %s: %w", queueName, err)
	}

	go func() {
		for d := range msgs {
			handler(d)
		}
	}()

	return nil
}

// PublishEvent publishes a JSON-serialised payload to the wbot.events exchange.
func (s *RabbitMQService) PublishEvent(routingKey string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return s.channel.Publish("wbot.events", routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Body:         body,
		Timestamp:    time.Now(),
	})
}

// Close gracefully closes channel and connection.
func (s *RabbitMQService) Close() error {
	if s.channel != nil {
		_ = s.channel.Close()
	}
	if s.conn != nil {
		return s.conn.Close()
	}
	return nil
}
