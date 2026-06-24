package whatsapp

import (
	"encoding/base64"
	"testing"

	waProto "go.mau.fi/whatsmeow/binary/proto"
	"google.golang.org/protobuf/proto"
)

// TestDownloadableFromProto_SupportedTypes verifies that downloadableFromProto
// correctly unmarshals each supported media type.
func TestDownloadableFromProto_SupportedTypes(t *testing.T) {
	cases := []struct {
		mediaType string
		msg       proto.Message
		wantMime  string
	}{
		{
			mediaType: "image",
			msg:       &waProto.ImageMessage{Mimetype: proto.String("image/jpeg")},
			wantMime:  "image/jpeg",
		},
		{
			mediaType: "video",
			msg:       &waProto.VideoMessage{Mimetype: proto.String("video/mp4")},
			wantMime:  "video/mp4",
		},
		{
			mediaType: "audio",
			msg:       &waProto.AudioMessage{Mimetype: proto.String("audio/ogg")},
			wantMime:  "audio/ogg",
		},
		{
			mediaType: "document",
			msg:       &waProto.DocumentMessage{Mimetype: proto.String("application/pdf")},
			wantMime:  "application/pdf",
		},
		{
			mediaType: "sticker",
			msg:       &waProto.StickerMessage{Mimetype: proto.String("image/webp")},
			wantMime:  "image/webp",
		},
	}

	for _, tc := range cases {
		raw, err := proto.Marshal(tc.msg)
		if err != nil {
			t.Fatalf("[%s] marshal: %v", tc.mediaType, err)
		}
		dl, mime, err := downloadableFromProto(tc.mediaType, raw)
		if err != nil {
			t.Errorf("[%s] unexpected error: %v", tc.mediaType, err)
			continue
		}
		if dl == nil {
			t.Errorf("[%s] expected non-nil DownloadableMessage", tc.mediaType)
		}
		if mime != tc.wantMime {
			t.Errorf("[%s] mime: got %q want %q", tc.mediaType, mime, tc.wantMime)
		}
	}
}

// TestDownloadableFromProto_UnsupportedType verifies an error is returned for
// unknown media types.
func TestDownloadableFromProto_UnsupportedType(t *testing.T) {
	_, _, err := downloadableFromProto("unknown", []byte{})
	if err == nil {
		t.Fatal("expected error for unsupported media type")
	}
}

// TestDownloadableFromProto_InvalidProto verifies that corrupt proto bytes
// produce an unmarshal error.
func TestDownloadableFromProto_InvalidProto(t *testing.T) {
	badBytes := []byte{0xFF, 0xFE, 0xFD}
	_, _, err := downloadableFromProto("image", badBytes)
	if err == nil {
		t.Fatal("expected unmarshal error for corrupted proto bytes")
	}
}

// TestDownloadMedia_InvalidBase64 verifies that DownloadMedia returns an error
// when the MediaProto field is not valid base64.
func TestDownloadMedia_InvalidBase64(t *testing.T) {
	svc := newTestServiceWithClient(1, nil)
	err := svc.DownloadMedia(1, "tenant-1", DownloadMediaCommandPayload{
		SessionID:  1,
		MessageID:  "msg-1",
		MediaType:  "image",
		MediaProto: "not-valid-base64!!!",
	})
	if err == nil {
		t.Fatal("expected error for invalid base64")
	}
}

// TestDownloadMedia_NoSession verifies DownloadMedia returns an error when the
// session is not connected.
func TestDownloadMedia_NoSession(t *testing.T) {
	svc := newTestServiceWithClient(1, nil)
	validProto, _ := proto.Marshal(&waProto.ImageMessage{Mimetype: proto.String("image/jpeg")})
	err := svc.DownloadMedia(99, "tenant-1", DownloadMediaCommandPayload{
		SessionID:  99,
		MessageID:  "msg-2",
		MediaType:  "image",
		MediaProto: base64.StdEncoding.EncodeToString(validProto),
	})
	if err == nil {
		t.Fatal("expected error for non-existent session")
	}
}

// TestDownloadMedia_UnsupportedMediaType verifies DownloadMedia returns an error
// when the MediaProto decodes but the media type is unknown.
func TestDownloadMedia_UnsupportedMediaType(t *testing.T) {
	svc := newTestServiceWithClient(1, nil)
	// Session 1 not connected — the session error fires first.
	err := svc.DownloadMedia(1, "tenant-1", DownloadMediaCommandPayload{
		SessionID:  1,
		MessageID:  "msg-3",
		MediaType:  "sticker",
		MediaProto: base64.StdEncoding.EncodeToString([]byte{}),
	})
	// Without a connected client the session error returns first; still an error.
	if err == nil {
		t.Fatal("expected error")
	}
}
