package whatsapp

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"
)

// ---------------------------------------------------------------------------
// Send methods
// ---------------------------------------------------------------------------

// SendText sends a plain text message, with optional quoted reply and mentions.
func (s *WhatsAppService) SendText(sessionID int, tenantID string, payload TextCommandPayload) error {
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

	msg := buildTextMessage(payload.Body, payload.QuotedMsgID, payload.QuotedJID, payload.Mentions)
	_, err = client.SendMessage(context.Background(), to, msg, whatsmeow.SendRequestExtra{ID: types.MessageID(payload.MessageID)})
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	s.emitAck(sessionID, tenantID, payload.MessageID, 1)
	return nil
}

// SendMedia uploads and sends an image/video/audio/document message.
func (s *WhatsAppService) SendMedia(sessionID int, tenantID string, payload MediaCommandPayload) error {
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

	data, err := resolveMediaBytes(payload)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}

	mediaType := normalizeMediaType(payload.MediaType)
	uploaded, err := client.Upload(context.Background(), data, mediaType)
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}

	message := buildMediaMessage(payload, uploaded)
	_, err = client.SendMessage(context.Background(), to, message, whatsmeow.SendRequestExtra{ID: types.MessageID(payload.MessageID)})
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	s.emitAck(sessionID, tenantID, payload.MessageID, 1)
	return nil
}

// MarkRead marks one or more messages as read for the given chat.
func (s *WhatsAppService) MarkRead(sessionID int, payload MarkReadCommandPayload) error {
	client, err := s.getConnectedClient(sessionID)
	if err != nil {
		return err
	}

	chat, err := ensureJID(payload.ChatJID)
	if err != nil {
		return fmt.Errorf("invalid chat JID %q: %w", payload.ChatJID, err)
	}
	sender := chat
	if payload.SenderJID != "" {
		if parsed, parseErr := ensureJID(payload.SenderJID); parseErr == nil {
			sender = parsed
		}
	}

	ids := make([]types.MessageID, 0, len(payload.MessageIDs))
	for _, id := range payload.MessageIDs {
		ids = append(ids, types.MessageID(id))
	}
	return client.MarkRead(context.Background(), ids, time.Now(), chat, sender)
}

// SendButtons sends a legacy ButtonsMessage (up to 3 reply buttons).
// Note: WhatsApp may not render this on newer clients; prefer SendInteractive.
func (s *WhatsAppService) SendButtons(sessionID int, tenantID string, payload ButtonsCommandPayload) error {
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

	buttons := make([]*waProto.ButtonsMessage_Button, 0, len(payload.Buttons))
	for _, b := range payload.Buttons {
		b := b
		buttons = append(buttons, &waProto.ButtonsMessage_Button{
			ButtonID:   proto.String(b.ID),
			ButtonText: &waProto.ButtonsMessage_Button_ButtonText{DisplayText: proto.String(b.DisplayText)},
			Type:       waProto.ButtonsMessage_Button_RESPONSE.Enum(),
		})
	}

	msg := &waProto.Message{
		ButtonsMessage: &waProto.ButtonsMessage{
			ContentText: proto.String(payload.ContentText),
			FooterText:  proto.String(payload.FooterText),
			Buttons:     buttons,
			HeaderType:  waProto.ButtonsMessage_TEXT.Enum(),
		},
	}

	_, err = client.SendMessage(context.Background(), to, msg, whatsmeow.SendRequestExtra{ID: types.MessageID(payload.MessageID)})
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	s.emitAck(sessionID, tenantID, payload.MessageID, 1)
	return nil
}

// SendList sends a ListMessage (single-select dropdown with sections).
func (s *WhatsAppService) SendList(sessionID int, tenantID string, payload ListCommandPayload) error {
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

	sections := make([]*waProto.ListMessage_Section, 0, len(payload.Sections))
	for _, sec := range payload.Sections {
		rows := make([]*waProto.ListMessage_Row, 0, len(sec.Rows))
		for _, r := range sec.Rows {
			r := r
			rows = append(rows, &waProto.ListMessage_Row{
				RowID:       proto.String(r.ID),
				Title:       proto.String(r.Title),
				Description: proto.String(r.Description),
			})
		}
		sec := sec
		sections = append(sections, &waProto.ListMessage_Section{
			Title: proto.String(sec.Title),
			Rows:  rows,
		})
	}

	msg := &waProto.Message{
		ListMessage: &waProto.ListMessage{
			Title:       proto.String(payload.Title),
			ButtonText:  proto.String(payload.ButtonText),
			Description: proto.String(payload.Description),
			FooterText:  proto.String(payload.FooterText),
			ListType:    waProto.ListMessage_SINGLE_SELECT.Enum(),
			Sections:    sections,
		},
	}

	_, err = client.SendMessage(context.Background(), to, msg, whatsmeow.SendRequestExtra{ID: types.MessageID(payload.MessageID)})
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	s.emitAck(sessionID, tenantID, payload.MessageID, 1)
	return nil
}

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

// SendInteractive sends a NativeFlow message — the modern replacement for buttons/templates.
// Each button has a Name (e.g. "quick_reply") and Params (JSON string).
func (s *WhatsAppService) SendInteractive(sessionID int, tenantID string, payload InteractiveCommandPayload) error {
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

	nativeButtons := make([]*waProto.InteractiveMessage_NativeFlowMessage_NativeFlowButton, 0, len(payload.Buttons))
	for _, b := range payload.Buttons {
		b := b
		nativeButtons = append(nativeButtons, &waProto.InteractiveMessage_NativeFlowMessage_NativeFlowButton{
			Name:             proto.String(b.Name),
			ButtonParamsJSON: proto.String(b.Params),
		})
	}

	msg := &waProto.Message{
		InteractiveMessage: &waProto.InteractiveMessage{
			Body:       &waProto.InteractiveMessage_Body{Text: proto.String(payload.BodyText)},
			Footer:     &waProto.InteractiveMessage_Footer{Text: proto.String(payload.FooterText)},
			InteractiveMessage: &waProto.InteractiveMessage_NativeFlowMessage_{
				NativeFlowMessage: &waProto.InteractiveMessage_NativeFlowMessage{
					Buttons: nativeButtons,
				},
			},
		},
	}

	_, err = client.SendMessage(context.Background(), to, msg, whatsmeow.SendRequestExtra{ID: types.MessageID(payload.MessageID)})
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	s.emitAck(sessionID, tenantID, payload.MessageID, 1)
	return nil
}

// SyncContact checks whether a number is on WhatsApp and emits a contact.update event
// with the resolved JID (and LID mapping if applicable).
func (s *WhatsAppService) SyncContact(sessionID int, tenantID string, payload SyncContactPayload) error {
	client, err := s.getConnectedClient(sessionID)
	if err != nil {
		return err
	}

	number := strings.TrimSpace(payload.Number)
	if !strings.HasPrefix(number, "+") {
		number = "+" + number
	}

	results, err := client.IsOnWhatsApp(context.Background(), []string{number})
	if err != nil {
		return fmt.Errorf("IsOnWhatsApp failed: %w", err)
	}

	for _, r := range results {
		if !r.IsIn {
			log.Printf("contact.sync: %s is not on WhatsApp", number)
			continue
		}

		contactPayload := map[string]interface{}{
			"jid":    r.JID.String(),
			"isLid":  r.JID.Server == types.HiddenUserServer,
			"number": number,
		}

		// Resolve LID → phone number if the JID came back as LID.
		if r.JID.Server == types.HiddenUserServer {
			if pn, mapErr := client.Store.LIDs.GetPNForLID(context.Background(), r.JID); mapErr == nil && !pn.IsEmpty() {
				contactPayload["phoneJid"] = pn.String()
			}
		}

		profilePic := ""
		if info, picErr := client.GetProfilePictureInfo(context.Background(), r.JID, &whatsmeow.GetProfilePictureParams{}); picErr == nil && info != nil {
			profilePic = info.URL
		}
		contactPayload["profilePicUrl"] = profilePic

		s.publishEvent(tenantID, sessionID, "contact.update", map[string]interface{}{
			"sessionId": payload.SessionID,
			"contact":   contactPayload,
		})
	}
	return nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func buildTextMessage(body, quotedMsgID, quotedJID string, mentions []string) *waProto.Message {
	if quotedMsgID == "" && len(mentions) == 0 {
		return &waProto.Message{Conversation: proto.String(body)}
	}

	ctx := &waProto.ContextInfo{}
	if quotedMsgID != "" {
		ctx.StanzaID = proto.String(quotedMsgID)
		if quotedJID != "" {
			ctx.Participant = proto.String(quotedJID)
			ctx.RemoteJID = proto.String(quotedJID)
		}
	}
	if len(mentions) > 0 {
		ctx.MentionedJID = mentions
	}

	return &waProto.Message{
		ExtendedTextMessage: &waProto.ExtendedTextMessage{
			Text:        proto.String(body),
			ContextInfo: ctx,
		},
	}
}

func resolveMediaBytes(payload MediaCommandPayload) ([]byte, error) {
	if payload.MediaData != "" {
		return base64.StdEncoding.DecodeString(payload.MediaData)
	}
	if payload.MediaURL == "" {
		return nil, fmt.Errorf("mediaUrl or mediaData is required")
	}
	paths := []string{payload.MediaURL}
	if !filepath.IsAbs(payload.MediaURL) {
		paths = append(paths, filepath.Join("public", payload.MediaURL))
		paths = append(paths, filepath.Join("..", "business", "public", payload.MediaURL))
	}
	var lastErr error
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err == nil {
			return data, nil
		}
		lastErr = err
	}
	return nil, lastErr
}

func normalizeMediaType(mediaType string) whatsmeow.MediaType {
	switch strings.ToLower(mediaType) {
	case "image":
		return whatsmeow.MediaImage
	case "video":
		return whatsmeow.MediaVideo
	case "audio":
		return whatsmeow.MediaAudio
	case "sticker":
		return whatsmeow.MediaImage
	default:
		return whatsmeow.MediaDocument
	}
}

func buildMediaMessage(payload MediaCommandPayload, uploaded whatsmeow.UploadResponse) *waProto.Message {
	mimeType := payload.MimeType
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	var ctx *waProto.ContextInfo
	if payload.QuotedMsgID != "" || len(payload.Mentions) > 0 {
		ctx = &waProto.ContextInfo{}
		if payload.QuotedMsgID != "" {
			ctx.StanzaID = proto.String(payload.QuotedMsgID)
			if payload.QuotedJID != "" {
				ctx.Participant = proto.String(payload.QuotedJID)
				ctx.RemoteJID = proto.String(payload.QuotedJID)
			}
		}
		if len(payload.Mentions) > 0 {
			ctx.MentionedJID = payload.Mentions
		}
	}

	switch strings.ToLower(payload.MediaType) {
	case "image":
		return &waProto.Message{ImageMessage: &waProto.ImageMessage{
			Caption: proto.String(payload.Body), Mimetype: proto.String(mimeType),
			URL: proto.String(uploaded.URL), DirectPath: proto.String(uploaded.DirectPath),
			MediaKey: uploaded.MediaKey, FileEncSHA256: uploaded.FileEncSHA256,
			FileSHA256: uploaded.FileSHA256, FileLength: proto.Uint64(uploaded.FileLength),
			ContextInfo: ctx,
		}}
	case "video":
		return &waProto.Message{VideoMessage: &waProto.VideoMessage{
			Caption: proto.String(payload.Body), Mimetype: proto.String(mimeType),
			URL: proto.String(uploaded.URL), DirectPath: proto.String(uploaded.DirectPath),
			MediaKey: uploaded.MediaKey, FileEncSHA256: uploaded.FileEncSHA256,
			FileSHA256: uploaded.FileSHA256, FileLength: proto.Uint64(uploaded.FileLength),
			ContextInfo: ctx,
		}}
	case "audio":
		return &waProto.Message{AudioMessage: &waProto.AudioMessage{
			Mimetype: proto.String(mimeType),
			URL: proto.String(uploaded.URL), DirectPath: proto.String(uploaded.DirectPath),
			MediaKey: uploaded.MediaKey, FileEncSHA256: uploaded.FileEncSHA256,
			FileSHA256: uploaded.FileSHA256, FileLength: proto.Uint64(uploaded.FileLength),
			ContextInfo: ctx,
		}}
	default:
		fileName := payload.FileName
		if fileName == "" {
			fileName = filepath.Base(payload.MediaURL)
		}
		return &waProto.Message{DocumentMessage: &waProto.DocumentMessage{
			Caption: proto.String(payload.Body), Title: proto.String(fileName),
			FileName: proto.String(fileName), Mimetype: proto.String(mimeType),
			URL: proto.String(uploaded.URL), DirectPath: proto.String(uploaded.DirectPath),
			MediaKey: uploaded.MediaKey, FileEncSHA256: uploaded.FileEncSHA256,
			FileSHA256: uploaded.FileSHA256, FileLength: proto.Uint64(uploaded.FileLength),
			ContextInfo: ctx,
		}}
	}
}
