package services

import (
	"fmt"
	"log"
	"time"

	amqp "github.com/streadway/amqp"
)

const (
	dlqExchange    = "wbot.dlq"
	dlqMaxRetries  = 3
	dlqBaseBackoff = 5 * time.Second
	dlqMaxBackoff  = 5 * time.Minute
	dlqMessageTTL  = 86400000 // 24h in ms
)

func (s *RabbitMQService) declareQueueWithDLQ(queueName, exchange string, routingKeys []string) error {
	dlqQueueName := queueName + ".dlq"

	if _, err := s.channel.QueueDeclare(
		dlqQueueName, true, false, false, false, nil,
	); err != nil {
		return fmt.Errorf("DLQ queue %s: %v", dlqQueueName, err)
	}

	if err := s.channel.QueueBind(dlqQueueName, "#", dlqExchange, false, nil); err != nil {
		return fmt.Errorf("DLQ bind %s: %v", dlqQueueName, err)
	}

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
		if err := d.Nack(false, false); err != nil {
			log.Printf("[RabbitMQ] Nack failed: %v", err)
		}
		return
	}

	backoff := dlqBaseBackoff * time.Duration(1<<uint(retryCount))
	if backoff > dlqMaxBackoff {
		backoff = dlqMaxBackoff
	}

	log.Printf("[RabbitMQ] Requeuing with %v backoff (retry %d)", backoff, retryCount+1)
	time.Sleep(backoff)

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
		if nErr := d.Nack(false, false); nErr != nil {
			log.Printf("[RabbitMQ] Nack failed: %v", nErr)
		}
		return
	}

	if err := d.Ack(false); err != nil {
		log.Printf("[RabbitMQ] Ack failed: %v", err)
	}
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
