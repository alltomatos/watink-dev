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
	// Worker runs in its own goroutine to handle reconnections
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

			// Declare exchange (ensure it exists)
			_ = ch.ExchangeDeclare(
				"api.events", // name
				"topic",      // type
				true,         // durable
				false,        // auto-deleted
				false,        // internal
				false,        // no-wait
				nil,          // arguments
			)

			// Declare queue
			q, err := ch.QueueDeclare(
				"flow.worker.queue", // name
				true,                // durable
				false,               // delete when unused
				false,               // exclusive
				false,               // no-wait
				nil,                 // arguments
			)
			if err != nil {
				log.Printf("[FlowWorker] Failed to declare queue: %v", err)
				ch.Close()
				time.Sleep(5 * time.Second)
				continue
			}

			// Bind to flow execution events
			_ = ch.QueueBind(
				q.Name,
				"flow.execution.*", // routing key
				"api.events",       // exchange
				false,
				nil,
			)

			msgs, err := ch.Consume(
				q.Name,
				"",    // consumer
				true,  // auto-ack
				false, // exclusive
				false, // no-local
				false, // no-wait
				nil,   // args
			)
			if err != nil {
				log.Printf("[FlowWorker] Failed to register consumer: %v", err)
				ch.Close()
				time.Sleep(5 * time.Second)
				continue
			}

			log.Println("🚀 Flow Worker (Go) listening for events...")
			
			// Listen for channel closure
			closeChan := ch.NotifyClose(make(chan *amqp.Error))

			workerLoop:
			for {
				select {
				case d, ok := <-msgs:
					if !ok {
						break workerLoop
					}
					var env Envelope
					if err := json.Unmarshal(d.Body, &env); err != nil {
						log.Printf("[FlowWorker] Error decoding envelope: %v", err)
						continue
					}
					log.Printf("[FlowWorker] Received event: %s for Tenant: %s", env.Type, env.TenantID)
				case err := <-closeChan:
					log.Printf("[FlowWorker] Channel closed: %v", err)
					break workerLoop
				}
			}
			ch.Close()
		}
	}()
}
