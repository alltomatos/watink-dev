package whatsapp

// Payload types — exported so main.go can unmarshal directly into these structs.

type TextCommandPayload struct {
	SessionID   int      `json:"sessionId"`
	MessageID   string   `json:"messageId"`
	To          string   `json:"to"`
	Body        string   `json:"body"`
	QuotedMsgID string   `json:"quotedMsgId,omitempty"`
	QuotedJID   string   `json:"quotedJid,omitempty"`
	Mentions    []string `json:"mentions,omitempty"`
}

type MediaCommandPayload struct {
	SessionID   int      `json:"sessionId"`
	MessageID   string   `json:"messageId"`
	To          string   `json:"to"`
	Body        string   `json:"body"`
	MediaURL    string   `json:"mediaUrl"`
	MediaType   string   `json:"mediaType"`
	MimeType    string   `json:"mimeType"`
	FileName    string   `json:"fileName"`
	MediaData   string   `json:"mediaData"`
	QuotedMsgID string   `json:"quotedMsgId,omitempty"`
	QuotedJID   string   `json:"quotedJid,omitempty"`
	Mentions    []string `json:"mentions,omitempty"`
}

type MarkReadCommandPayload struct {
	ChatJID    string   `json:"chatJid"`
	SenderJID  string   `json:"senderJid"`
	MessageIDs []string `json:"messageIds"`
}

// ButtonsCommandPayload carries a legacy ButtonsMessage (up to 3 buttons).
type ButtonsCommandPayload struct {
	SessionID   string          `json:"sessionId"`
	MessageID   string          `json:"messageId"`
	To          string          `json:"to"`
	ContentText string          `json:"contentText"`
	FooterText  string          `json:"footerText,omitempty"`
	Buttons     []ButtonPayload `json:"buttons"`
}

type ButtonPayload struct {
	ID          string `json:"id"`
	DisplayText string `json:"displayText"`
}

// ListCommandPayload carries a ListMessage with sections and rows.
type ListCommandPayload struct {
	SessionID   string               `json:"sessionId"`
	MessageID   string               `json:"messageId"`
	To          string               `json:"to"`
	Title       string               `json:"title"`
	ButtonText  string               `json:"buttonText"`
	Description string               `json:"description,omitempty"`
	FooterText  string               `json:"footerText,omitempty"`
	Sections    []ListSectionPayload `json:"sections"`
}

type ListSectionPayload struct {
	Title string           `json:"title"`
	Rows  []ListRowPayload `json:"rows"`
}

type ListRowPayload struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
}

// PollCommandPayload carries a poll creation message.
type PollCommandPayload struct {
	SessionID       string   `json:"sessionId"`
	MessageID       string   `json:"messageId"`
	To              string   `json:"to"`
	Name            string   `json:"name"`
	Options         []string `json:"options"`
	SelectableCount int      `json:"selectableCount"`
}

// InteractiveCommandPayload carries a NativeFlow (modern interactive) message.
type InteractiveCommandPayload struct {
	SessionID  string                     `json:"sessionId"`
	MessageID  string                     `json:"messageId"`
	To         string                     `json:"to"`
	BodyText   string                     `json:"bodyText"`
	FooterText string                     `json:"footerText,omitempty"`
	Buttons    []InteractiveButtonPayload `json:"buttons"`
}

type InteractiveButtonPayload struct {
	Name   string `json:"name"`
	Params string `json:"params"`
}

// SyncContactPayload carries a contact sync request.
type SyncContactPayload struct {
	SessionID string `json:"sessionId"`
	Number    string `json:"number"`
}
