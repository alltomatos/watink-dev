package domain

// Broadcaster is the interface for real-time event delivery.
// RedisBroadcast (Socket.IO, legacy) and SSEBroadcast both implement it.
type Broadcaster interface {
	EmitToRoom(nsp, room, event string, payload interface{})
	EmitToTenantRoom(tenantID, event string, payload interface{})
	EmitToNamespace(nsp, event string, payload interface{})
}

// nopBroadcaster is a no-op Broadcaster used as a null-object default.
type nopBroadcaster struct{}

func (nopBroadcaster) EmitToRoom(_, _, _ string, _ interface{})    {}
func (nopBroadcaster) EmitToTenantRoom(_, _ string, _ interface{}) {}
func (nopBroadcaster) EmitToNamespace(_, _ string, _ interface{})  {}

// BroadcastOrNop returns b if non-nil, otherwise a no-op Broadcaster.
// Use this in constructors so nil broadcast arguments don't cause panics.
func BroadcastOrNop(b Broadcaster) Broadcaster {
	if b == nil {
		return nopBroadcaster{}
	}
	return b
}
