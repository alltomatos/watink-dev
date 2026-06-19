package services

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

// When no ticket is targeted (bootstrap sync) or there are no messages, the
// handler must no-op without touching any repository — safe even with nil deps.
func TestHandleHistorySync_IgnoresWithoutTicketOrMessages(t *testing.T) {
	el := &EventListener{} // all repos nil — must not be dereferenced

	cases := []HistorySyncPayload{
		{SessionID: "1", Type: "INITIAL_BOOTSTRAP", TicketID: 0, Messages: nil},
		{SessionID: "1", Type: "ON_DEMAND", TicketID: 5, Messages: nil},
		{SessionID: "1", Type: "ON_DEMAND", TicketID: 0, Messages: []MessagePayload{{ID: "a"}}},
	}

	for i, p := range cases {
		payload, _ := json.Marshal(p)
		if err := el.handleHistorySync(context.Background(), payload, uuid.New()); err != nil {
			t.Errorf("case %d: expected nil error, got %v", i, err)
		}
	}
}
