package whatsapp

import (
	"context"

	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
)

// WhatsAppClient is the minimal interface over *whatsmeow.Client needed for
// testable send and contact helpers. Only methods actually called in
// send_poll.go are included here; contacts.go accesses the Store field
// directly and is tested via pure-helper coverage instead.
type WhatsAppClient interface {
	// SendMessage sends a WhatsApp message to the given JID.
	SendMessage(ctx context.Context, to types.JID, message *waE2E.Message, extra ...whatsmeow.SendRequestExtra) (whatsmeow.SendResponse, error)

	// BuildPollCreation constructs a poll message ready to be passed to SendMessage.
	BuildPollCreation(name string, optionNames []string, selectableOptionCount int) *waE2E.Message

	// IsOnWhatsApp checks whether a list of phone numbers are registered on WhatsApp.
	IsOnWhatsApp(ctx context.Context, phones []string) ([]types.IsOnWhatsAppResponse, error)

	// GetProfilePictureInfo retrieves the profile picture metadata for a JID.
	GetProfilePictureInfo(ctx context.Context, jid types.JID, params *whatsmeow.GetProfilePictureParams) (*types.ProfilePictureInfo, error)
}

// compile-time assertion: *whatsmeow.Client must satisfy WhatsAppClient.
var _ WhatsAppClient = (*whatsmeow.Client)(nil)
