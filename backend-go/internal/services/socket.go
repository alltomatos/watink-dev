package services

import (
	"log"
	"net/http"
	"strings"

	socketio "github.com/googollee/go-socket.io"
)

var Server *socketio.Server

func StartSocket() *socketio.Server {
	server := socketio.NewServer(nil)

	server.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		log.Println("connected:", s.ID())
		return nil
	})

	server.OnEvent("/", "joinChat", func(s socketio.Conn, msg string) {
		log.Println("joinChat:", msg)
		s.Join(msg)
	})

	server.OnEvent("/", "joinNotification", func(s socketio.Conn, msg string) {
		log.Println("joinNotification:", msg)
		s.Join(msg)
	})

	server.OnEvent("/", "joinTickets", func(s socketio.Conn, msg string) {
		log.Println("joinTickets:", msg)
		s.Join(msg)
	})

	server.OnError("/", func(s socketio.Conn, e error) {
		// Avoid noisy logs for expected websocket read timeouts/disconnect churn.
		if e != nil {
			msg := strings.ToLower(e.Error())
			if strings.Contains(msg, "i/o timeout") || strings.Contains(msg, "timeout") {
				return
			}
		}
		log.Println("socket error:", e)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		log.Println("closed", reason)
	})

	go func() {
		if err := server.Serve(); err != nil {
			log.Fatalf("socketio listen error: %s\n", err)
		}
	}()

	Server = server
	return server
}

func GetIO() *socketio.Server {
	return Server
}

func SocketHandler(server *socketio.Server) http.Handler {
	return server
}

// Cluster-aware Broadcast
func EmitToRoom(nsp string, room string, event string, payload interface{}) {
	// 1. Emit locally
	if Server != nil {
		Server.BroadcastToRoom(nsp, room, event, payload)
	}
	// 2. Publish to Redis for other nodes
	PublishSocketMessage(SocketMessage{
		Namespace: nsp,
		Room:      room,
		Event:     event,
		Payload:   payload,
	})
}

func EmitToNamespace(nsp string, event string, payload interface{}) {
	// 1. Emit locally
	if Server != nil {
		Server.BroadcastToNamespace(nsp, event, payload)
	}
	// 2. Publish to Redis for other nodes
	PublishSocketMessage(SocketMessage{
		Namespace: nsp,
		Event:     event,
		Payload:   payload,
	})
}
