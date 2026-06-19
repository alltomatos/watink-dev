package whatsapp

import (
	"context"
	"fmt"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
)

// SendPoll creates and sends a poll message.
// selectableCount = maximum number of options the user can choose (1 = single choice).
func (s *WhatsAppService) SendPoll(sessionID int, tenantID string, payload PollCommandPayload) error {
	client, err := s.getConnectedClient(sessionID)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}

	to, err := ensureJID(payload.To)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return fmt.Errorf("invalid JID %q: %w", payload.To, err)
	}

	count := payload.SelectableCount
	if count < 1 {
		count = 1
	}

	_, err = client.SendMessage(
		context.Background(), to,
		client.BuildPollCreation(payload.Name, payload.Options, count),
		whatsmeow.SendRequestExtra{ID: types.MessageID(payload.MessageID)},
	)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	s.emitAck(sessionID, tenantID, payload.MessageID, 1)
	return nil
}
