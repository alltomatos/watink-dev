package services

import (
	"encoding/json"
	"log"

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

func SetupRedisBroadcast() {
	pubsub := RedisClient.Subscribe(ctx, "socketio:broadcast")

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
			if Server != nil {
				if sm.Room != "" {
					Server.BroadcastToRoom(sm.Namespace, sm.Room, sm.Event, sm.Payload)
				} else {
					Server.BroadcastToNamespace(sm.Namespace, sm.Event, sm.Payload)
				}
			}
		}
	}()
}

func PublishSocketMessage(sm SocketMessage) {
	if RedisClient == nil {
		return
	}

	sm.SourceID = NodeID
	payload, err := json.Marshal(sm)
	if err != nil {
		log.Printf("Error marshaling socket message: %v", err)
		return
	}

	err = RedisClient.Publish(ctx, "socketio:broadcast", payload).Err()
	if err != nil {
		log.Printf("Error publishing socket message to redis: %v", err)
	}
}
