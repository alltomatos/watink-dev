package services

import (
	"encoding/json"
	"log"
	"time"

	"github.com/streadway/amqp"
)

type Envelope struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	TenantID  string          `json:"tenantId"`
	Timestamp int64           `json:"timestamp"`
}

func (r *RabbitMQService) StartFlowWorker() {
	go func() {
		for {
			if r.conn == nil || r.conn.IsClosed() {
				time.Sleep(2 * time.Second)
				continue
			}

			ch, err := r.conn.Channel()
			if err != nil {
				log.Printf("[FlowWorker] Failed to open channel: %v", err)
				time.Sleep(5 * time.Second)
				continue
			}

			_ = ch.ExchangeDeclare("api.events", "topic", true, false, false, false, nil)

			// Declare queue with DLQ support
			args := amqp.Table{
				"x-dead-letter-exchange":    dlqExchange,
				"x-dead-letter-routing-key": "flow.worker.queue",
				"x-message-ttl":             int32(dlqMessageTTL),
			}

			q, err := ch.QueueDeclare(
				"flow.worker.queue", true, false, false, false, args,
			)
			if err != nil {
				log.Printf("[FlowWorker] Failed to declare queue: %v", err)
				ch.Close()
				time.Sleep(5 * time.Second)
				continue
			}

			_ = ch.QueueBind(q.Name, "flow.execution.*", "api.events", false, nil)

			// Manual ack — prevents message loss on crash
			msgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)
			if err != nil {
				log.Printf("[FlowWorker] Failed to register consumer: %v", err)
				ch.Close()
				time.Sleep(5 * time.Second)
				continue
			}

			log.Println("[FlowWorker] Listening for events...")

			closeChan := ch.NotifyClose(make(chan *amqp.Error))

		workerLoop:
			for {
				select {
				case d, ok := <-msgs:
					if !ok {
						break workerLoop
					}
					if err := r.processFlowEvent(d); err != nil {
						r.handleFailedMessage(d, err)
					} else {
						d.Ack(false)
					}
				case err := <-closeChan:
					log.Printf("[FlowWorker] Channel closed: %v", err)
					break workerLoop
				}
			}
			ch.Close()
		}
	}()
}

func (r *RabbitMQService) processFlowEvent(d amqp.Delivery) error {
	var env Envelope
	if err := json.Unmarshal(d.Body, &env); err != nil {
		log.Printf("[FlowWorker] Error decoding envelope: %v", err)
		return err
	}
	log.Printf("[FlowWorker] Event: %s | Tenant: %s", env.Type, env.TenantID)
	return nil
}
