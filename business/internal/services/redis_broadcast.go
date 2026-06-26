package services

import (
	"context"
	"encoding/json"
	"log"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
)

var NodeID = uuid.New().String()

type SocketMessage struct {
	SourceID  string      `json:"sid"`
	Namespace string      `json:"nsp"`
	Room      string      `json:"room"`
	Event     string      `json:"event"`
	Payload   interface{} `json:"payload"`
}

// RedisBroadcast handles cross-node broadcast via Redis Pub/Sub,
// delegating local delivery to a domain.Broadcaster sink (e.g. SSEBroadcast or SocketIOSink).
type RedisBroadcast struct {
	redisSvc  domain.RedisService
	localSink domain.Broadcaster
}

// NewRedisBroadcast creates a RedisBroadcast with DI — no global access.
func NewRedisBroadcast(redisSvc domain.RedisService, localSink domain.Broadcaster) *RedisBroadcast {
	return &RedisBroadcast{redisSvc: redisSvc, localSink: localSink}
}

// Start subscribes to the socketio:broadcast channel and relays messages to local clients.
func (rb *RedisBroadcast) Start() {
	pubsub := rb.redisSvc.Subscribe(context.Background(), "socketio:broadcast")

	go func() {
		ch := pubsub.Channel()
		for msg := range ch {
			var sm SocketMessage
			if err := json.Unmarshal([]byte(msg.Payload), &sm); err != nil {
				log.Printf("Error unmarshaling socket message from redis: %v", err)
				continue
			}

			// Ignore messages from self
			if sm.SourceID == NodeID {
				continue
			}

			// Broadcast to local clients via sink
			if rb.localSink != nil {
				if sm.Room != "" {
					rb.localSink.EmitToRoom(sm.Namespace, sm.Room, sm.Event, sm.Payload)
				} else {
					rb.localSink.EmitToNamespace(sm.Namespace, sm.Event, sm.Payload)
				}
			}
		}
	}()
}

// Publish publishes a SocketMessage to the broadcast channel via DI.
func (rb *RedisBroadcast) Publish(sm SocketMessage) {
	sm.SourceID = NodeID
	payload, err := json.Marshal(sm)
	if err != nil {
		log.Printf("Error marshaling socket message: %v", err)
		return
	}

	if err := rb.redisSvc.Publish(context.Background(), "socketio:broadcast", payload); err != nil {
		log.Printf("Error publishing socket message to redis: %v", err)
	}
}

// EmitToNamespace broadcasts events to a namespace — local delivery first, then Redis.
func (rb *RedisBroadcast) EmitToNamespace(nsp string, event string, payload interface{}) {
	if rb == nil {
		return
	}
	if rb.localSink != nil {
		rb.localSink.EmitToNamespace(nsp, event, payload)
	}
	rb.Publish(SocketMessage{
		Namespace: nsp,
		Event:     event,
		Payload:   payload,
	})
}

// EmitToTenantRoom broadcasts to the tenant-scoped room "tenant:{tenantID}",
// ensuring global events (whatsappSession, ticket) are isolated per tenant.
func (rb *RedisBroadcast) EmitToTenantRoom(tenantID string, event string, payload interface{}) {
	rb.EmitToRoom("/", "tenant:"+tenantID, event, payload)
}

// EmitToRoom delivers to local SSE clients immediately, then publishes to Redis
// so that other nodes in a multi-node deployment also receive the event.
// Local-first is required because the Start() goroutine skips messages that
// originated from this node (SourceID == NodeID guard prevents double-delivery
// on the remote nodes, but it would also skip self-delivery if we relied on
// Redis round-trip for local delivery).
func (rb *RedisBroadcast) EmitToRoom(nsp string, room string, event string, payload interface{}) {
	if rb == nil {
		return
	}
	// Local delivery (current node).
	if rb.localSink != nil {
		rb.localSink.EmitToRoom(nsp, room, event, payload)
	}
	// Cross-node delivery via Redis.
	rb.Publish(SocketMessage{
		Namespace: nsp,
		Room:      room,
		Event:     event,
		Payload:   payload,
	})
}
