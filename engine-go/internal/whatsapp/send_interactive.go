package whatsapp

import (
	"context"
	"fmt"

	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"
)

// SendButtons sends a legacy ButtonsMessage (up to 3 reply buttons).
// Note: WhatsApp returns 405 for personal accounts — use SendTemplate instead.
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

	// MessageVersion=3 é OBRIGATÓRIO para o recipiente renderizar os botões.
	// Sem ele a bolha degrada para texto puro (confirmado em whatsmeow #1144/#1145,
	// mai/2026: quick_reply e cta_url renderizam em contas pessoais Android/iOS/Web).
	msgVersion := int32(3)
	interactive := &waProto.InteractiveMessage{
		Body: &waProto.InteractiveMessage_Body{Text: proto.String(payload.BodyText)},
		InteractiveMessage: &waProto.InteractiveMessage_NativeFlowMessage_{
			NativeFlowMessage: &waProto.InteractiveMessage_NativeFlowMessage{
				Buttons:        nativeButtons,
				MessageVersion: &msgVersion,
			},
		},
	}
	if payload.FooterText != "" {
		interactive.Footer = &waProto.InteractiveMessage_Footer{Text: proto.String(payload.FooterText)}
	}

	msg := &waProto.Message{InteractiveMessage: interactive}

	_, err = client.SendMessage(context.Background(), to, msg, whatsmeow.SendRequestExtra{ID: types.MessageID(payload.MessageID)})
	if err != nil {
		s.emitAck(sessionID, tenantID, payload.MessageID, 5)
		return err
	}
	s.emitAck(sessionID, tenantID, payload.MessageID, 1)
	return nil
}

// SendTemplate sends a HydratedFourRowTemplate — renders clickable buttons on personal
// WhatsApp accounts. Supports up to 3 buttons: quickreply, url, or call.
func (s *WhatsAppService) SendTemplate(sessionID int, tenantID string, payload TemplateCommandPayload) error {
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

	hydratedButtons := make([]*waProto.HydratedTemplateButton, 0, len(payload.Buttons))
	for i, b := range payload.Buttons {
		idx := uint32(i)
		var hb *waProto.HydratedTemplateButton
		switch b.Type {
		case "url":
			hb = &waProto.HydratedTemplateButton{
				Index: proto.Uint32(idx),
				HydratedButton: &waProto.HydratedTemplateButton_UrlButton{
					UrlButton: &waProto.HydratedTemplateButton_HydratedURLButton{
						DisplayText: proto.String(b.DisplayText),
						URL:         proto.String(b.URL),
					},
				},
			}
		case "call":
			hb = &waProto.HydratedTemplateButton{
				Index: proto.Uint32(idx),
				HydratedButton: &waProto.HydratedTemplateButton_CallButton{
					CallButton: &waProto.HydratedTemplateButton_HydratedCallButton{
						DisplayText: proto.String(b.DisplayText),
						PhoneNumber: proto.String(b.PhoneNumber),
					},
				},
			}
		default: // "quickreply"
			id := b.ID
			if id == "" {
				id = fmt.Sprintf("btn_%d", i)
			}
			hb = &waProto.HydratedTemplateButton{
				Index: proto.Uint32(idx),
				HydratedButton: &waProto.HydratedTemplateButton_QuickReplyButton{
					QuickReplyButton: &waProto.HydratedTemplateButton_HydratedQuickReplyButton{
						DisplayText: proto.String(b.DisplayText),
						ID:          proto.String(id),
					},
				},
			}
		}
		hydratedButtons = append(hydratedButtons, hb)
	}

	msg := &waProto.Message{
		TemplateMessage: &waProto.TemplateMessage{
			Format: &waProto.TemplateMessage_HydratedFourRowTemplate_{
				HydratedFourRowTemplate: &waProto.TemplateMessage_HydratedFourRowTemplate{
					HydratedContentText: proto.String(payload.ContentText),
					HydratedFooterText:  proto.String(payload.FooterText),
					HydratedButtons:     hydratedButtons,
					Title: &waProto.TemplateMessage_HydratedFourRowTemplate_HydratedTitleText{
						HydratedTitleText: "",
					},
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
