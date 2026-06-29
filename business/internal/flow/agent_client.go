package flow

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
)

// AgentTurn is one entry of the conversation history sent to the agent brain.
type AgentTurn struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AgentReply is the decoded answer from the agent brain: the text to send back,
// the control action (continue/resolved/handoff), the model's confidence and the
// source citations that grounded the reply.
type AgentReply struct {
	Reply      string  `json:"reply"`
	Action     string  `json:"action"`
	Confidence float64 `json:"confidence"`
	Citations  []int   `json:"citations"`
}

// AgentResponder is the port the agent node depends on. The HTTP implementation
// calls the watink-knowledge brain; tests inject a fake.
type AgentResponder interface {
	Respond(ctx context.Context, tenantID uuid.UUID, kbID int, persona string, history []AgentTurn, query string) (AgentReply, error)
}

// HTTPAgentClient talks to the watink-knowledge agent endpoint
// (POST {baseURL}/agent/respond, authenticated by X-Internal-Token).
type HTTPAgentClient struct {
	baseURL string
	token   string
	client  *http.Client
}

// NewHTTPAgentClientFromEnv builds an HTTPAgentClient reading KNOWLEDGE_SERVICE_URL
// and INTERNAL_TOKEN from the environment, applying production-safe defaults. The
// timeout is generous (90s) because the brain runs an LLM call per turn.
func NewHTTPAgentClientFromEnv() *HTTPAgentClient {
	baseURL := os.Getenv("KNOWLEDGE_SERVICE_URL")
	if baseURL == "" {
		baseURL = "http://watink-knowledge:8085"
	}
	token := os.Getenv("INTERNAL_TOKEN")
	if token == "" {
		token = "dev_internal_token_change_in_prod"
	}
	return &HTTPAgentClient{
		baseURL: baseURL,
		token:   token,
		client:  &http.Client{Timeout: 90 * time.Second},
	}
}

// agentRequest is the JSON body sent to /agent/respond.
type agentRequest struct {
	TenantID        string      `json:"tenantId"`
	KnowledgeBaseID int         `json:"knowledgeBaseId"`
	Persona         string      `json:"persona"`
	History         []AgentTurn `json:"history"`
	Query           string      `json:"query"`
	TopK            int         `json:"topK"`
	MinScore        float64     `json:"minScore"`
}

// Respond posts the conversation to the agent brain and maps the response into an
// AgentReply. A non-200 status (or transport error) is returned as an error so the
// caller can degrade to a human handoff.
func (a *HTTPAgentClient) Respond(ctx context.Context, tenantID uuid.UUID, kbID int, persona string, history []AgentTurn, query string) (AgentReply, error) {
	body, err := json.Marshal(agentRequest{
		TenantID:        tenantID.String(),
		KnowledgeBaseID: kbID,
		Persona:         persona,
		History:         history,
		Query:           query,
		TopK:            6,
		MinScore:        defaultKnowledgeMinScore,
	})
	if err != nil {
		return AgentReply{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.baseURL+"/agent/respond", bytes.NewReader(body))
	if err != nil {
		return AgentReply{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", a.token)

	resp, err := a.client.Do(req)
	if err != nil {
		return AgentReply{}, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return AgentReply{}, fmt.Errorf("agent respond: status %d: %s", resp.StatusCode, string(b))
	}

	var reply AgentReply
	if err := json.NewDecoder(resp.Body).Decode(&reply); err != nil {
		return AgentReply{}, err
	}
	return reply, nil
}
