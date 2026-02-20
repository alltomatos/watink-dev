package services

import (
	"log"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	socketio "github.com/googollee/go-socket.io"
	"github.com/googollee/go-socket.io/engineio"
	"github.com/googollee/go-socket.io/engineio/transport"
	"github.com/googollee/go-socket.io/engineio/transport/polling"
	"github.com/googollee/go-socket.io/engineio/transport/websocket"
)

var Server *socketio.Server

var socketStats struct {
	connects       int64
	disconnects    int64
	timeouts       int64
	active         int64
	monitorStarted int64
}

const (
	socketConnectAlertThreshold    = 120
	socketDisconnectAlertThreshold = 120
	socketTimeoutAlertThreshold    = 60
)

func startSocketStatsMonitor() {
	if !atomic.CompareAndSwapInt64(&socketStats.monitorStarted, 0, 1) {
		return
	}

	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			connects := atomic.SwapInt64(&socketStats.connects, 0)
			disconnects := atomic.SwapInt64(&socketStats.disconnects, 0)
			timeouts := atomic.SwapInt64(&socketStats.timeouts, 0)
			active := atomic.LoadInt64(&socketStats.active)

			log.Printf("socket metrics/min connects=%d disconnects=%d timeouts=%d active=%d", connects, disconnects, timeouts, active)

			if connects >= socketConnectAlertThreshold ||
				disconnects >= socketDisconnectAlertThreshold ||
				timeouts >= socketTimeoutAlertThreshold {
				log.Printf("socket alert reconnect-storm connects=%d disconnects=%d timeouts=%d active=%d", connects, disconnects, timeouts, active)
			}
		}
	}()
}

func StartSocket() *socketio.Server {
	server := socketio.NewServer(&engineio.Options{
		Transports: []transport.Transport{
			&polling.Transport{
				CheckOrigin: func(r *http.Request) bool { return true },
			},
			&websocket.Transport{
				CheckOrigin: func(r *http.Request) bool { return true },
			},
		},
	})
	startSocketStatsMonitor()

	server.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		atomic.AddInt64(&socketStats.connects, 1)
		atomic.AddInt64(&socketStats.active, 1)
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
				atomic.AddInt64(&socketStats.timeouts, 1)
				return
			}
		}
		log.Println("socket error:", e)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		atomic.AddInt64(&socketStats.disconnects, 1)
		if active := atomic.AddInt64(&socketStats.active, -1); active < 0 {
			atomic.StoreInt64(&socketStats.active, 0)
		}
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
