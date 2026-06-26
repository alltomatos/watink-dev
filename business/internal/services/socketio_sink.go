package services

import socketio "github.com/googollee/go-socket.io"

// SocketIOSink adapts a *socketio.Server to domain.Broadcaster,
// used as the localSink for RedisBroadcast in the legacy Socket.IO path.
type SocketIOSink struct {
	server *socketio.Server
}

// NewSocketIOSink creates a SocketIOSink wrapping a socketio.Server.
func NewSocketIOSink(server *socketio.Server) *SocketIOSink {
	return &SocketIOSink{server: server}
}

func (s *SocketIOSink) EmitToRoom(nsp, room, event string, payload interface{}) {
	if s.server != nil {
		s.server.BroadcastToRoom(nsp, room, event, payload)
	}
}

func (s *SocketIOSink) EmitToTenantRoom(tenantID, event string, payload interface{}) {
	s.EmitToRoom("/", "tenant:"+tenantID, event, payload)
}

func (s *SocketIOSink) EmitToNamespace(nsp, event string, payload interface{}) {
	if s.server != nil {
		s.server.BroadcastToNamespace(nsp, event, payload)
	}
}
