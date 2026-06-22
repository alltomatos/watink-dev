package services

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	socketio "github.com/googollee/go-socket.io"
	"github.com/googollee/go-socket.io/engineio"
	"github.com/googollee/go-socket.io/engineio/transport"
	"github.com/googollee/go-socket.io/engineio/transport/polling"
	"github.com/googollee/go-socket.io/engineio/transport/websocket"
	"github.com/golang-jwt/jwt/v5"
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

// socketConnContext holds parsed JWT claims stored on each socket connection.
type socketConnContext struct {
	UserID   int
	TenantID string
	Profile  string
}

// validateSocketToken parses the JWT from the socket query param.
// Returns an error if the token is absent, invalid, or missing required claims.
func validateSocketToken(tokenStr string) (*socketConnContext, error) {
	if tokenStr == "" {
		return nil, fmt.Errorf("missing token")
	}
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET not configured")
	}
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !tok.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}
	tenantID, _ := claims["tenantId"].(string)
	profile, _ := claims["profile"].(string)
	userID := 0
	switch v := claims["id"].(type) {
	case float64:
		userID = int(v)
	case string:
		userID, _ = strconv.Atoi(v)
	}
	if tenantID == "" {
		return nil, fmt.Errorf("tenantId missing in token")
	}
	return &socketConnContext{UserID: userID, TenantID: tenantID, Profile: profile}, nil
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
		u := s.URL()
		token := u.Query().Get("token")
		ctx, err := validateSocketToken(token)
		if err != nil {
			log.Printf("socket auth rejected id=%s: %v", s.ID(), err)
			return fmt.Errorf("unauthorized")
		}
		s.SetContext(ctx)
		atomic.AddInt64(&socketStats.connects, 1)
		atomic.AddInt64(&socketStats.active, 1)
		log.Printf("socket connected id=%s tenant=%s user=%d", s.ID(), ctx.TenantID, ctx.UserID)
		return nil
	})

	server.OnEvent("/", "joinChat", func(s socketio.Conn, msg string) {
		log.Println("joinChat:", msg)
		s.Join(msg)
	})

	server.OnEvent("/", "joinNotification", func(s socketio.Conn, _ string) {
		log.Println("joinNotification: joined notification room")
		s.Join("notification")
	})

	server.OnEvent("/", "joinTickets", func(s socketio.Conn, msg string) {
		log.Println("joinTickets:", msg)
		s.Join(msg)
	})

	// joinTenant places the socket in a tenant-scoped room used for global
	// broadcasts (whatsappSession, ticket events) — isolates tenants.
	server.OnEvent("/", "joinTenant", func(s socketio.Conn, tenantID string) {
		if ctx, ok := s.Context().(*socketConnContext); ok && ctx.TenantID == tenantID {
			s.Join("tenant:" + tenantID)
			log.Printf("socket joinTenant id=%s tenant=%s", s.ID(), tenantID)
		} else {
			log.Printf("socket joinTenant rejected id=%s claimed=%s", s.ID(), tenantID)
		}
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
	log.Printf("[DEPRECATION WARNING] EmitToRoom called")
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
	log.Printf("[DEPRECATION WARNING] EmitToNamespace called")
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
