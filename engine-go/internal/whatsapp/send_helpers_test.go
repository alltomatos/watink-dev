package whatsapp

import (
	"encoding/base64"
	"testing"

	"go.mau.fi/whatsmeow"
)

func TestBuildTextMessage_PlainConversation(t *testing.T) {
	msg := buildTextMessage("hello", "", "", nil)
	if msg.GetConversation() != "hello" {
		t.Fatalf("expected plain conversation, got %q", msg.GetConversation())
	}
	if msg.GetExtendedTextMessage() != nil {
		t.Fatal("plain message should not use ExtendedTextMessage")
	}
}

func TestBuildTextMessage_WithQuote(t *testing.T) {
	msg := buildTextMessage("reply", "QUOTED1", "5511@s.whatsapp.net", nil)
	ext := msg.GetExtendedTextMessage()
	if ext == nil {
		t.Fatal("quoted message should use ExtendedTextMessage")
	}
	if ext.GetText() != "reply" {
		t.Errorf("text = %q", ext.GetText())
	}
	if ext.GetContextInfo().GetStanzaID() != "QUOTED1" {
		t.Errorf("stanzaID = %q", ext.GetContextInfo().GetStanzaID())
	}
}

func TestBuildTextMessage_WithMentions(t *testing.T) {
	mentions := []string{"5511@s.whatsapp.net", "5522@s.whatsapp.net"}
	msg := buildTextMessage("hi @a @b", "", "", mentions)
	ext := msg.GetExtendedTextMessage()
	if ext == nil {
		t.Fatal("mention message should use ExtendedTextMessage")
	}
	if len(ext.GetContextInfo().GetMentionedJID()) != 2 {
		t.Errorf("expected 2 mentions, got %d", len(ext.GetContextInfo().GetMentionedJID()))
	}
}

func TestNormalizeMediaType(t *testing.T) {
	cases := map[string]whatsmeow.MediaType{
		"image":    whatsmeow.MediaImage,
		"IMAGE":    whatsmeow.MediaImage,
		"video":    whatsmeow.MediaVideo,
		"audio":    whatsmeow.MediaAudio,
		"sticker":  whatsmeow.MediaImage,
		"document": whatsmeow.MediaDocument,
		"weird":    whatsmeow.MediaDocument,
	}
	for in, want := range cases {
		if got := normalizeMediaType(in); got != want {
			t.Errorf("normalizeMediaType(%q) = %v, want %v", in, got, want)
		}
	}
}

func TestResolveMediaBytes_FromBase64(t *testing.T) {
	raw := []byte("binary-content")
	payload := MediaCommandPayload{MediaData: base64.StdEncoding.EncodeToString(raw)}
	got, err := resolveMediaBytes(payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(got) != string(raw) {
		t.Errorf("got %q, want %q", got, raw)
	}
}

func TestResolveMediaBytes_MissingSource(t *testing.T) {
	_, err := resolveMediaBytes(MediaCommandPayload{})
	if err == nil {
		t.Fatal("expected error when neither mediaData nor mediaUrl is set")
	}
}

func TestBuildMediaMessage_Image(t *testing.T) {
	payload := MediaCommandPayload{MediaType: "image", Body: "caption", MimeType: "image/png"}
	msg := buildMediaMessage(payload, whatsmeow.UploadResponse{})
	if msg.GetImageMessage() == nil {
		t.Fatal("expected ImageMessage")
	}
	if msg.GetImageMessage().GetCaption() != "caption" {
		t.Errorf("caption = %q", msg.GetImageMessage().GetCaption())
	}
}

func TestBuildMediaMessage_DocumentDefault(t *testing.T) {
	payload := MediaCommandPayload{MediaType: "application/zip", FileName: "f.zip"}
	msg := buildMediaMessage(payload, whatsmeow.UploadResponse{})
	if msg.GetDocumentMessage() == nil {
		t.Fatal("expected DocumentMessage for non-media type")
	}
	if msg.GetDocumentMessage().GetFileName() != "f.zip" {
		t.Errorf("fileName = %q", msg.GetDocumentMessage().GetFileName())
	}
}
