package whatsapp

import (
	"context"
	"time"

	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
)

// WhatsAppClient is the minimal interface over *whatsmeow.Client needed for
// testable send, download and contact helpers.
type WhatsAppClient interface {
	// SendMessage sends a WhatsApp message to the given JID.
	SendMessage(ctx context.Context, to types.JID, message *waE2E.Message, extra ...whatsmeow.SendRequestExtra) (whatsmeow.SendResponse, error)

	// BuildPollCreation constructs a poll message ready to be passed to SendMessage.
	BuildPollCreation(name string, optionNames []string, selectableOptionCount int) *waE2E.Message

	// IsOnWhatsApp checks whether a list of phone numbers are registered on WhatsApp.
	IsOnWhatsApp(ctx context.Context, phones []string) ([]types.IsOnWhatsAppResponse, error)

	// GetProfilePictureInfo retrieves the profile picture metadata for a JID.
	GetProfilePictureInfo(ctx context.Context, jid types.JID, params *whatsmeow.GetProfilePictureParams) (*types.ProfilePictureInfo, error)

	// Download downloads the full media bytes for a downloadable WhatsApp message.
	Download(ctx context.Context, msg whatsmeow.DownloadableMessage) ([]byte, error)

	// Upload encrypts and uploads plaintext media bytes to WhatsApp servers.
	Upload(ctx context.Context, plaintext []byte, appInfo whatsmeow.MediaType) (whatsmeow.UploadResponse, error)

	// MarkRead marks a set of messages as read in the given chat.
	MarkRead(ctx context.Context, ids []types.MessageID, timestamp time.Time, chat, sender types.JID, receiptTypeExtra ...types.ReceiptType) error
}

// compile-time assertion: *whatsmeow.Client must satisfy WhatsAppClient.
var _ WhatsAppClient = (*whatsmeow.Client)(nil)
