package services

import (
	"fmt"
	"log"
	"sync"
	"time"
)

// SSEHub manages active SSE connections and delivers events to rooms.
type SSEHub struct {
	mu    sync.RWMutex
	conns map[string]*sseConn // connID → conn
}

type sseConn struct {
	ch    chan string // buffered channel of SSE-formatted strings
	rooms map[string]bool
}

func NewSSEHub() *SSEHub {
	return &SSEHub{conns: make(map[string]*sseConn)}
}

// Register adds a new SSE connection and returns its channel and a cleanup func.
func (h *SSEHub) Register(connID string, rooms []string) (<-chan string, func()) {
	ch := make(chan string, 64)
	conn := &sseConn{ch: ch, rooms: make(map[string]bool)}
	for _, r := range rooms {
		conn.rooms[r] = true
	}
	h.mu.Lock()
	h.conns[connID] = conn
	h.mu.Unlock()
	return ch, func() {
		h.mu.Lock()
		delete(h.conns, connID)
		remaining := len(h.conns)
		h.mu.Unlock()
		close(ch)
		log.Printf("[SSEHub] disconnect connID=%s remaining=%d rooms=%v", connID, remaining, rooms)
	}
}

// Deliver sends an SSE event to all connections subscribed to the given room.
func (h *SSEHub) Deliver(room, event string, data string) {
	msg := fmt.Sprintf("event: %s\ndata: %s\n\n", event, data)
	h.mu.RLock()
	defer h.mu.RUnlock()
	sent := 0
	for _, conn := range h.conns {
		if conn.rooms[room] {
			select {
			case conn.ch <- msg:
				sent++
			default: // drop if slow consumer
			}
		}
	}
	if sent == 0 {
		// Debug: log rooms of ALL active connections when delivery fails
		roomsSnapshot := make([][]string, 0, len(h.conns))
		for _, c := range h.conns {
			var rs []string
			for r := range c.rooms {
				rs = append(rs, r)
			}
			roomsSnapshot = append(roomsSnapshot, rs)
		}
		log.Printf("[SSEHub] Deliver room=%s event=%s conns=%d sent=0 activeRooms=%v", room, event, len(h.conns), roomsSnapshot)
	}
}

// StartHeartbeat sends SSE comment pings to all connections every interval.
func (h *SSEHub) StartHeartbeat(interval time.Duration) {
	go func() {
		t := time.NewTicker(interval)
		defer t.Stop()
		for range t.C {
			h.mu.RLock()
			for _, conn := range h.conns {
				select {
				case conn.ch <- ": ping\n\n":
				default:
				}
			}
			h.mu.RUnlock()
		}
	}()
}
