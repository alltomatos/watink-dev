package whatsapp

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"google.golang.org/protobuf/proto"
)

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
			URL:      proto.String(uploaded.URL), DirectPath: proto.String(uploaded.DirectPath),
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
