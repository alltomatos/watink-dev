package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/streadway/amqp"
	"go.opentelemetry.io/otel"
)

type RabbitMQService struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	url     string

	mu sync.Mutex
}

func NewRabbitMQProvider(url string) *RabbitMQService {
	if url == "" {
		url = os.Getenv("AMQP_URL")
		if url == "" {
			url = "amqp://localhost:5672"
		}
	}
	return &RabbitMQService{
		url: url,
	}
}

func (s *RabbitMQService) Connect() error {
	conn, err := amqp.Dial(s.url)
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %v", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return fmt.Errorf("failed to open a channel: %v", err)
	}

	if err := ch.Qos(10, 0, false); err != nil {
		log.Printf("[RabbitMQ] Warning: failed to set QoS prefetch: %v", err)
	}

	s.mu.Lock()
	s.conn = conn
	s.channel = ch
	s.mu.Unlock()

	if err := s.setupExchanges(); err != nil {
		return fmt.Errorf("failed to setup exchanges: %v", err)
	}

	go func() {
		<-conn.NotifyClose(make(chan *amqp.Error))
		log.Println("[RabbitMQ] Connection closed. Reconnecting...")
		for {
			time.Sleep(5 * time.Second)
			if err := s.Connect(); err != nil {
				log.Printf("[RabbitMQ] Reconnect failed, retrying: %v", err)
				continue
			}
			return
		}
	}()

	log.Println("[RabbitMQ] Connected successfully")
	return nil
}

// currentConn returns the live connection under lock — Connect() replaces
// s.conn on every reconnect, and consumer supervisor goroutines (see
// runConsumerLoop) read it concurrently with that replacement.
func (s *RabbitMQService) currentConn() *amqp.Connection {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.conn
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
		{"knowledge.jobs", "topic"},
		{"knowledge.events", "topic"},
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

// PublishKnowledgeJob publishes an ingestion job to the knowledge.jobs exchange
// for the watink-knowledge microservice to consume.
func (s *RabbitMQService) PublishKnowledgeJob(routingKey string, payload interface{}) error {
	return s.publishWithTrace("knowledge.jobs", routingKey, payload)
}

// PublishKnowledgeEvent publishes a status event (ingestion progress/result)
// to the knowledge.events exchange — consumed by KnowledgeStatusListener to
// update the Source and by the ingestion worker's own status reporting.
func (s *RabbitMQService) PublishKnowledgeEvent(routingKey string, payload interface{}) error {
	return s.publishWithTrace("knowledge.events", routingKey, payload)
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

	s.mu.Lock()
	ch := s.channel
	s.mu.Unlock()

	return ch.Publish(
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
	return s.startConsumer("wbot.events", queueName, routingKeys, handler)
}

// ConsumeKnowledgeEvents binds a queue to the knowledge.events exchange (with
// DLQ) and dispatches each delivery to handler. Mirrors ConsumeEvents but for
// the knowledge status stream.
func (s *RabbitMQService) ConsumeKnowledgeEvents(queueName string, routingKeys []string, handler func(amqp.Delivery) error) error {
	return s.startConsumer("knowledge.events", queueName, routingKeys, handler)
}

// ConsumeKnowledgeJobs binds a queue to the knowledge.jobs exchange (with DLQ)
// and dispatches each delivery to handler — the native Go ingestion worker's
// entry point, replacing the watink-knowledge Python consumer. Unlike the old
// service (which never declared a DLQ on this queue), a job that keeps
// failing lands in the dead-letter queue instead of vanishing.
func (s *RabbitMQService) ConsumeKnowledgeJobs(queueName string, routingKeys []string, handler func(amqp.Delivery) error) error {
	return s.startConsumer("knowledge.jobs", queueName, routingKeys, handler)
}

// startConsumer opens a channel DEDICATED to this consumer (never the shared
// s.channel used for publishing) and hands it to a self-healing supervisor
// loop. Every Consume* used to share one amqp.Channel for publishing and
// every consumer; a single protocol-level exception on any of them (e.g. a
// publish to a stale/unknown exchange, or a bad Ack/Nack) closes that shared
// channel per the AMQP spec — which silently kills every consumer goroutine
// at once (their `range msgs` just ends), while the underlying *connection*
// stays healthy. Only connection-level closure was ever monitored, so this
// went completely unnoticed: diagnosed live in homolog with
// api.events.process.go stuck at 0 consumers for days, a perfectly healthy
// AMQP connection, and no error anywhere in the logs. Giving each consumer
// its own channel isolates it from the others and from publishing, and the
// supervisor loop below watches that channel's own NotifyClose so it can
// reopen and resume on its own — independent of whether the connection also
// dropped.
func (s *RabbitMQService) startConsumer(exchange, queueName string, routingKeys []string, handler func(amqp.Delivery) error) error {
	ch, err := s.openConsumerChannel(exchange, queueName, routingKeys)
	if err != nil {
		return err
	}

	go s.runConsumerLoop(ch, exchange, queueName, routingKeys, handler)
	return nil
}

// openConsumerChannel opens a fresh channel on the current connection, sets
// its QoS, and declares the queue + DLQ + bindings on it.
func (s *RabbitMQService) openConsumerChannel(exchange, queueName string, routingKeys []string) (*amqp.Channel, error) {
	conn := s.currentConn()
	if conn == nil {
		return nil, fmt.Errorf("rabbitmq not connected")
	}

	ch, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("open channel for %s: %v", queueName, err)
	}

	if err := ch.Qos(10, 0, false); err != nil {
		log.Printf("[RabbitMQ] Warning: failed to set QoS for %s: %v", queueName, err)
	}

	if err := declareQueueWithDLQ(ch, queueName, exchange, routingKeys); err != nil {
		ch.Close()
		return nil, err
	}

	return ch, nil
}

// runConsumerLoop consumes deliveries on ch until it closes — whether from a
// channel-level protocol error or the underlying connection dropping — then
// retries with backoff to reopen a channel (waiting on IsConnected() if the
// connection itself is mid-reconnect) and resume. It never returns.
func (s *RabbitMQService) runConsumerLoop(ch *amqp.Channel, exchange, queueName string, routingKeys []string, handler func(amqp.Delivery) error) {
	const (
		initialBackoff = 2 * time.Second
		maxBackoff     = 30 * time.Second
	)

	for {
		msgs, err := ch.Consume(queueName, "", false, false, false, false, nil)
		if err != nil {
			log.Printf("[RabbitMQ] Consume failed for queue %q: %v", queueName, err)
			ch.Close()
		} else {
			closeNotify := ch.NotifyClose(make(chan *amqp.Error, 1))

			for d := range msgs {
				if err := handler(d); err != nil {
					s.handleFailedMessage(ch, exchange, d, err)
				} else if err := d.Ack(false); err != nil {
					log.Printf("[RabbitMQ] Ack failed for queue %q: %v", queueName, err)
				}
			}

			if amqpErr := <-closeNotify; amqpErr != nil {
				log.Printf("[RabbitMQ] Channel for queue %q closed: %v — resubscribing", queueName, amqpErr)
			} else {
				log.Printf("[RabbitMQ] Channel for queue %q closed — resubscribing", queueName)
			}
		}

		backoff := initialBackoff
		for {
			time.Sleep(backoff)
			if !s.IsConnected() {
				continue
			}
			newCh, err := s.openConsumerChannel(exchange, queueName, routingKeys)
			if err != nil {
				log.Printf("[RabbitMQ] Failed to reopen channel for queue %q: %v — retrying in %v", queueName, err, backoff)
				if backoff < maxBackoff {
					backoff *= 2
				}
				continue
			}
			ch = newCh
			break
		}
	}
}

func (s *RabbitMQService) Close() error {
	s.mu.Lock()
	ch, conn := s.channel, s.conn
	s.mu.Unlock()

	if ch != nil {
		ch.Close()
	}
	if conn != nil {
		return conn.Close()
	}
	return nil
}
