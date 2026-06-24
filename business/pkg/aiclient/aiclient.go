package aiclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Config struct {
	Provider string // "openai" | "anthropic" | "grok" | "custom"
	Model    string
	APIKey   string
	BaseURL  string // only used for "custom"
	System   string // optional system prompt
}

type Response struct {
	Content string
}

// Complete sends messages to the configured LLM and returns the assistant reply.
func Complete(cfg Config, messages []Message) (*Response, error) {
	if cfg.APIKey == "" {
		return nil, fmt.Errorf("ERR_NO_AI_API_KEY")
	}

	switch cfg.Provider {
	case "anthropic":
		return callAnthropic(cfg, messages)
	case "openai", "grok", "custom":
		return callOpenAICompatible(cfg, messages)
	default:
		return callOpenAICompatible(cfg, messages)
	}
}

func callOpenAICompatible(cfg Config, messages []Message) (*Response, error) {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		switch cfg.Provider {
		case "grok":
			baseURL = "https://api.x.ai/v1"
		default:
			baseURL = "https://api.openai.com/v1"
		}
	}

	model := cfg.Model
	if model == "" {
		model = "gpt-4o"
	}

	payload := map[string]any{
		"model":    model,
		"messages": messages,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("ERR_AI_SERVICE_FAILED: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ERR_AI_SERVICE_FAILED: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ERR_AI_SERVICE_FAILED: status %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("ERR_AI_SERVICE_FAILED: %w", err)
	}
	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("ERR_AI_SERVICE_FAILED: empty response")
	}

	return &Response{Content: result.Choices[0].Message.Content}, nil
}

func callAnthropic(cfg Config, messages []Message) (*Response, error) {
	model := cfg.Model
	if model == "" {
		model = "claude-3-5-sonnet-20241022"
	}

	type anthropicMsg struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	var msgs []anthropicMsg
	for _, m := range messages {
		role := m.Role
		if role == "assistant" || role == "user" {
			msgs = append(msgs, anthropicMsg{Role: role, Content: m.Content})
		}
	}

	payload := map[string]any{
		"model":      model,
		"max_tokens": 1024,
		"messages":   msgs,
	}
	if cfg.System != "" {
		payload["system"] = cfg.System
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("ERR_AI_SERVICE_FAILED: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", cfg.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ERR_AI_SERVICE_FAILED: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ERR_AI_SERVICE_FAILED: status %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("ERR_AI_SERVICE_FAILED: %w", err)
	}
	for _, c := range result.Content {
		if c.Type == "text" {
			return &Response{Content: c.Text}, nil
		}
	}

	return nil, fmt.Errorf("ERR_AI_SERVICE_FAILED: no text content in response")
}
