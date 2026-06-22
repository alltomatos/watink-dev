package services

import (
	"context"
	"encoding/json"
	"log"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/google/uuid"
	socketio "github.com/googollee/go-socket.io"
)

var NodeID = uuid.New().String()

type SocketMessage struct {
	SourceID  string      `json:"sid"`
	Namespace string      `json:"nsp"`
	Room      string      `json:"room"`
	Event     string      `json:"event"`
	Payload   interface{} `json:"payload"`
}

// RedisBroadcast handles Socket.IO cross-node broadcast via Redis Pub/Sub.
type RedisBroadcast struct {
	redisSvc domain.RedisService
	server   *socketio.Server
}

// NewRedisBroadcast creates a RedisBroadcast with DI — no global access.
func NewRedisBroadcast(redisSvc domain.RedisService, server *socketio.Server) *RedisBroadcast {
	return &RedisBroadcast{redisSvc: redisSvc, server: server}
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

			// Broadcast to local clients
			if rb.server != nil {
				if sm.Room != "" {
					rb.server.BroadcastToRoom(sm.Namespace, sm.Room, sm.Event, sm.Payload)
				} else {
					rb.server.BroadcastToNamespace(sm.Namespace, sm.Event, sm.Payload)
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

// EmitToNamespace broadcasts events to a namespace globally via Redis.
func (rb *RedisBroadcast) EmitToNamespace(nsp string, event string, payload interface{}) {
	if rb == nil {
		return
	} // Safety check
	if rb.server != nil {
		rb.server.BroadcastToNamespace(nsp, event, payload)
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

// EmitToRoom broadcasts events to a room globally via Redis.
func (rb *RedisBroadcast) EmitToRoom(nsp string, room string, event string, payload interface{}) {
	if rb == nil {
		return
	} // Safety check
	if rb.server != nil {
		rb.server.BroadcastToRoom(nsp, room, event, payload)
	}
	rb.Publish(SocketMessage{
		Namespace: nsp,
		Room:      room,
		Event:     event,
		Payload:   payload,
	})
}

