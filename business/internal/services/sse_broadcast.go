package services

import (
	"encoding/json"
	"log"
)

// SSEBroadcast implements domain.Broadcaster using the local SSEHub.
type SSEBroadcast struct {
	hub *SSEHub
}

func NewSSEBroadcast(hub *SSEHub) *SSEBroadcast {
	return &SSEBroadcast{hub: hub}
}

func (b *SSEBroadcast) EmitToRoom(nsp, room, event string, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("SSEBroadcast marshal error event=%s: %v", event, err)
		return
	}
	b.hub.Deliver(room, event, string(data))
}

func (b *SSEBroadcast) EmitToTenantRoom(tenantID, event string, payload interface{}) {
	b.EmitToRoom("/", "tenant:"+tenantID, event, payload)
}

func (b *SSEBroadcast) EmitToNamespace(nsp, event string, payload interface{}) {
	// SSE has no concept of namespace broadcast; log and no-op for now.
	log.Printf("SSEBroadcast.EmitToNamespace called nsp=%s event=%s — use EmitToTenantRoom instead", nsp, event)
}
