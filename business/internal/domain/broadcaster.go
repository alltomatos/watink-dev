package domain

// Broadcaster is the interface for real-time event delivery.
// RedisBroadcast (Socket.IO, legacy) and SSEBroadcast both implement it.
type Broadcaster interface {
	EmitToRoom(nsp, room, event string, payload interface{})
	EmitToTenantRoom(tenantID, event string, payload interface{})
	EmitToNamespace(nsp, event string, payload interface{})
}
