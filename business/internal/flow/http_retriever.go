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

// HTTPRetriever talks to the watink-knowledge retrieval HTTP endpoint
// (POST {baseURL}/retrieve, authenticated by X-Internal-Token).
type HTTPRetriever struct {
	baseURL string
	token   string
	client  *http.Client
}

// NewHTTPRetrieverFromEnv builds an HTTPRetriever reading KNOWLEDGE_SERVICE_URL
// and INTERNAL_TOKEN from the environment, applying production-safe defaults.
func NewHTTPRetrieverFromEnv() *HTTPRetriever {
	baseURL := os.Getenv("KNOWLEDGE_SERVICE_URL")
	if baseURL == "" {
		baseURL = "http://watink-knowledge:8085"
	}
	token := os.Getenv("INTERNAL_TOKEN")
	if token == "" {
		token = "dev_internal_token_change_in_prod"
	}
	return &HTTPRetriever{
		baseURL: baseURL,
		token:   token,
		client:  &http.Client{Timeout: 30 * time.Second},
	}
}

// retrieveRequest is the JSON body sent to /retrieve.
type retrieveRequest struct {
	TenantID        string  `json:"tenantId"`
	KnowledgeBaseID int     `json:"knowledgeBaseId"`
	Query           string  `json:"query"`
	TopK            int     `json:"topK"`
	MinScore        float64 `json:"minScore"`
}

// retrieveResponse is the JSON response from /retrieve.
type retrieveResponse struct {
	Chunks []struct {
		Text     string  `json:"text"`
		SourceID int     `json:"sourceId"`
		Score    float64 `json:"score"`
		Citation string  `json:"citation"`
	} `json:"chunks"`
}

// Retrieve posts the query to the knowledge service and maps the response into
// []RetrievedChunk.
func (r *HTTPRetriever) Retrieve(ctx context.Context, tenantID uuid.UUID, kbID, topK int, minScore float64, query string) ([]RetrievedChunk, error) {
	body, err := json.Marshal(retrieveRequest{
		TenantID:        tenantID.String(),
		KnowledgeBaseID: kbID,
		Query:           query,
		TopK:            topK,
		MinScore:        minScore,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.baseURL+"/retrieve", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", r.token)

	resp, err := r.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("knowledge retrieve: status %d: %s", resp.StatusCode, string(b))
	}

	var parsed retrieveResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}

	chunks := make([]RetrievedChunk, 0, len(parsed.Chunks))
	for _, c := range parsed.Chunks {
		chunks = append(chunks, RetrievedChunk{
			Text:     c.Text,
			SourceID: c.SourceID,
			Score:    c.Score,
			Citation: c.Citation,
		})
	}
	return chunks, nil
}
