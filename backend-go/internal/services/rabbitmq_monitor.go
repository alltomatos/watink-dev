package services

import (
	"strings"
)

type QueueMetrics struct {
	Name           string `json:"name"`
	Messages       int    `json:"messages"`
	Consumers      int    `json:"consumers"`
	Ready          int    `json:"ready"`
	Unacknowledged int    `json:"unacknowledged"`
	Error          string `json:"error,omitempty"`
}

func (s *RabbitMQService) IsConnected() bool {
	return s != nil && s.conn != nil && !s.conn.IsClosed()
}

func (s *RabbitMQService) InspectQueue(queueName string) QueueMetrics {
	m := QueueMetrics{Name: queueName}
	if !s.IsConnected() {
		m.Error = "not_connected"
		return m
	}

	ch, err := s.conn.Channel()
	if err != nil {
		m.Error = err.Error()
		return m
	}
	defer ch.Close()

	q, err := ch.QueueInspect(queueName)
	if err != nil {
		m.Error = err.Error()
		return m
	}

	m.Messages = q.Messages
	m.Ready = q.Messages
	m.Consumers = q.Consumers
	m.Unacknowledged = 0
	return m
}

func ParseQueueList(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return []string{"api.events.process.go", "flow.worker.queue"}
	}
	parts := strings.Split(raw, ",")
	queues := make([]string, 0, len(parts))
	for _, p := range parts {
		q := strings.TrimSpace(p)
		if q != "" {
			queues = append(queues, q)
		}
	}
	if len(queues) == 0 {
		queues = []string{"api.events.process.go", "flow.worker.queue"}
	}
	return queues
}
