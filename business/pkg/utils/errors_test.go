package utils

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newGinContext(method, path string) (*gin.Context, *httptest.ResponseRecorder) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(method, path, nil)
	c.Request = req
	return c, w
}

func TestParseIntParam(t *testing.T) {
	tests := []struct {
		name       string
		paramValue string
		wantValue  int
		wantOK     bool
		wantStatus int
	}{
		{"valid positive", "42", 42, true, 0},
		{"valid one", "1", 1, true, 0},
		{"zero is invalid", "0", 0, false, http.StatusBadRequest},
		{"negative is invalid", "-5", 0, false, http.StatusBadRequest},
		{"non-numeric", "abc", 0, false, http.StatusBadRequest},
		{"empty string", "", 0, false, http.StatusBadRequest},
		{"float string", "3.14", 0, false, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			req := httptest.NewRequest(http.MethodGet, "/test/"+tt.paramValue, nil)
			c.Request = req
			c.Params = gin.Params{{Key: "id", Value: tt.paramValue}}

			got, ok := ParseIntParam(c, "id")

			if ok != tt.wantOK {
				t.Fatalf("ParseIntParam ok = %v, want %v", ok, tt.wantOK)
			}
			if ok && got != tt.wantValue {
				t.Fatalf("ParseIntParam value = %d, want %d", got, tt.wantValue)
			}
			if !ok {
				if w.Code != tt.wantStatus {
					t.Fatalf("status = %d, want %d", w.Code, tt.wantStatus)
				}
				var body map[string]string
				if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
					t.Fatalf("decode response body: %v", err)
				}
				if _, hasError := body["error"]; !hasError {
					t.Fatalf("expected 'error' key in response body, got %v", body)
				}
			}
		})
	}
}

func TestParseIntParam_ErrorMessageContainsParamName(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/test/abc", nil)
	c.Params = gin.Params{{Key: "ticketId", Value: "abc"}}

	_, ok := ParseIntParam(c, "ticketId")

	if ok {
		t.Fatal("expected ok=false for non-numeric param")
	}
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	msg := body["error"]
	if msg != "invalid ticketId" {
		t.Fatalf("expected error message 'invalid ticketId', got %q", msg)
	}
}

func TestRespondWithError(t *testing.T) {
	tests := []struct {
		name       string
		code       int
		message    string
		wantStatus int
	}{
		{"bad request", http.StatusBadRequest, "bad input", http.StatusBadRequest},
		{"not found", http.StatusNotFound, "not found", http.StatusNotFound},
		{"internal error", http.StatusInternalServerError, "server error", http.StatusInternalServerError},
		{"unauthorized", http.StatusUnauthorized, "unauthorized", http.StatusUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, w := newGinContext(http.MethodGet, "/test")

			RespondWithError(c, tt.code, errors.New("internal cause"), tt.message)

			if w.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", w.Code, tt.wantStatus)
			}
			var body map[string]string
			if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if body["error"] != tt.message {
				t.Fatalf("error message = %q, want %q", body["error"], tt.message)
			}
		})
	}
}

func TestRespondWithBindError(t *testing.T) {
	c, w := newGinContext(http.MethodPost, "/test")

	RespondWithBindError(c, errors.New("missing required field"))

	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusBadRequest)
	}
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	want := "Invalid request format or missing required fields"
	if body["error"] != want {
		t.Fatalf("error message = %q, want %q", body["error"], want)
	}
}

func TestRespondWithInternalError(t *testing.T) {
	c, w := newGinContext(http.MethodGet, "/some/path")

	RespondWithInternalError(c, errors.New("db connection failed"), "UserService.Create")

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusInternalServerError)
	}
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	want := "Internal server error. Please try again later."
	if body["error"] != want {
		t.Fatalf("error message = %q, want %q", body["error"], want)
	}
}

func TestRespondWithServiceError(t *testing.T) {
	tests := []struct {
		name        string
		code        int
		safeMessage string
	}{
		{"conflict", http.StatusConflict, "resource already exists"},
		{"forbidden", http.StatusForbidden, "access denied"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, w := newGinContext(http.MethodDelete, "/resource/1")

			RespondWithServiceError(c, tt.code, errors.New("internal detail"), tt.safeMessage)

			if w.Code != tt.code {
				t.Fatalf("status = %d, want %d", w.Code, tt.code)
			}
			var body map[string]string
			if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if body["error"] != tt.safeMessage {
				t.Fatalf("error = %q, want %q", body["error"], tt.safeMessage)
			}
		})
	}
}

func TestLogOnlyError_DoesNotWriteResponse(t *testing.T) {
	c, w := newGinContext(http.MethodGet, "/test")

	LogOnlyError(c, errors.New("some transient error"), "BackgroundJob")

	if w.Code != http.StatusOK {
		t.Fatalf("expected no response written (200 default), got %d", w.Code)
	}
	if w.Body.Len() != 0 {
		t.Fatalf("expected empty body, got %q", w.Body.String())
	}
}
