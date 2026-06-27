package whatsapp

import (
	"context"
	"fmt"
	"net/http"

	"go.mau.fi/whatsmeow"
	waBinary "go.mau.fi/whatsmeow/binary"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"
)

// SendCarousel sends an interactive carousel — a horizontal list of cards, each with
// an image header, body text and NativeFlow buttons. Each card's image is uploaded
// to WhatsApp first. Like SendInteractive, it injects the <biz> native_flow node so
// recent WhatsApp clients render it on personal accounts (sem o nó, são descartadas).
func (s *WhatsAppService) SendCarousel(sessionID int, tenantID string, payload CarouselCommandPayload) error {
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

	if len(payload.Cards) == 0 {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return fmt.Errorf("carousel requires at least one card")
	}

	cardVersion := int32(1)
	cards := make([]*waProto.InteractiveMessage, 0, len(payload.Cards))
	for i, c := range payload.Cards {
		card := &waProto.InteractiveMessage{
			Body: &waProto.InteractiveMessage_Body{Text: proto.String(c.Title)},
		}

		// Upload the card image and attach it as the header media.
		data, derr := resolveImageBytes(c.ImageURL, c.ImageData)
		if derr != nil {
			s.emitAck(sessionID, tenantID, payload.MessageID, 5)
			return fmt.Errorf("card %d image: %w", i, derr)
		}
		uploaded, uerr := client.Upload(context.Background(), data, whatsmeow.MediaImage)
		if uerr != nil {
			s.emitAck(sessionID, tenantID, payload.MessageID, 5)
			return fmt.Errorf("card %d upload: %w", i, uerr)
		}
		card.Header = &waProto.InteractiveMessage_Header{
			HasMediaAttachment: proto.Bool(true),
			Media: &waProto.InteractiveMessage_Header_ImageMessage{
				ImageMessage: &waProto.ImageMessage{
					Mimetype:      proto.String(http.DetectContentType(data)),
					URL:           proto.String(uploaded.URL),
					DirectPath:    proto.String(uploaded.DirectPath),
					MediaKey:      uploaded.MediaKey,
					FileEncSHA256: uploaded.FileEncSHA256,
					FileSHA256:    uploaded.FileSHA256,
					FileLength:    proto.Uint64(uploaded.FileLength),
				},
			},
		}

		if c.Footer != "" {
			card.Footer = &waProto.InteractiveMessage_Footer{Text: proto.String(c.Footer)}
		}

		nativeButtons := make([]*waProto.InteractiveMessage_NativeFlowMessage_NativeFlowButton, 0, len(c.Buttons))
		for _, b := range c.Buttons {
			b := b
			nativeButtons = append(nativeButtons, &waProto.InteractiveMessage_NativeFlowMessage_NativeFlowButton{
				Name:             proto.String(b.Name),
				ButtonParamsJSON: proto.String(b.Params),
			})
		}
		card.InteractiveMessage = &waProto.InteractiveMessage_NativeFlowMessage_{
			NativeFlowMessage: &waProto.InteractiveMessage_NativeFlowMessage{
				Buttons:        nativeButtons,
				MessageVersion: &cardVersion,
			},
		}

		cards = append(cards, card)
	}

	carouselVersion := int32(1)
	top := &waProto.InteractiveMessage{
		InteractiveMessage: &waProto.InteractiveMessage_CarouselMessage_{
			CarouselMessage: &waProto.InteractiveMessage_CarouselMessage{
				Cards:          cards,
				MessageVersion: &carouselVersion,
			},
		},
	}
	if payload.BodyText != "" {
		top.Body = &waProto.InteractiveMessage_Body{Text: proto.String(payload.BodyText)}
	}

	msg := &waProto.Message{InteractiveMessage: top}

	// <biz> native_flow node — sem ele clientes recentes descartam a mensagem.
	bizNode := waBinary.Node{
		Tag: "biz",
		Content: []waBinary.Node{{
			Tag:   "interactive",
			Attrs: waBinary.Attrs{"type": "native_flow", "v": "1"},
			Content: []waBinary.Node{{
				Tag:   "native_flow",
				Attrs: waBinary.Attrs{"v": "9", "name": "mixed"},
			}},
		}},
	}
	additionalNodes := []waBinary.Node{bizNode}

	_, err = client.SendMessage(context.Background(), to, msg, whatsmeow.SendRequestExtra{
		ID:              types.MessageID(payload.MessageID),
		AdditionalNodes: &additionalNodes,
	})
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	s.emitAck(sessionID, tenantID, payload.MessageID, 1)
	return nil
}
