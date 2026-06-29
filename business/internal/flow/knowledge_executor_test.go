package flow

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/alltomatos/watinkdev/business/internal/domain"
	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/alltomatos/watinkdev/business/internal/testutil"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeRetriever returns canned chunks and records what it was asked for.
type fakeRetriever struct {
	chunks    []RetrievedChunk
	lastQuery string
	lastKB    int
}

func (f *fakeRetriever) Retrieve(_ context.Context, _ uuid.UUID, kbID, _ int, _ float64, query string) ([]RetrievedChunk, error) {
	f.lastQuery = query
	f.lastKB = kbID
	return f.chunks, nil
}

func newKnowledgeState(t *testing.T, retr Retriever, inbound string) (*ExecState, *captureAdapter) {
	t.Helper()
	db := testutil.NewTestDB(t)
	adapter := &captureAdapter{}
	reg := NewChannelRegistry()
	reg.Register(adapter)
	return &ExecState{
		TenantID:  uuid.New(),
		Run:       &models.FlowRun{ID: uuid.New()},
		Inbound:   inbound,
		Contact:   &domain.Contact{Number: "5511999999999"},
		Ticket:    &domain.Ticket{WhatsappID: 1},
		Registry:  reg,
		DB:        db,
		Retriever: retr,
	}, adapter
}

func knowledgeNode(kbID int) Node {
	data, _ := json.Marshal(map[string]any{"knowledgeBaseId": kbID, "responseMode": "auto"})
	return Node{ID: "kb", Type: "knowledge", Data: data}
}

// Empty retrieval → guardrail: tell the contact nothing was found, never hallucinate.
func TestKnowledgeExecutor_EmptyRetrieval_SendsNotFound(t *testing.T) {
	retr := &fakeRetriever{chunks: nil}
	st, adapter := newKnowledgeState(t, retr, "qual o horario?")

	out, err := knowledgeExecutor{}.Execute(context.Background(), st, knowledgeNode(1))
	require.NoError(t, err)
	assert.Equal(t, OutcomeAdvance, out.Kind)

	bodies := adapter.bodies()
	require.Len(t, bodies, 1)
	assert.Contains(t, bodies[0], "Não encontrei")
	assert.Equal(t, "qual o horario?", retr.lastQuery)
	assert.Equal(t, 1, retr.lastKB)
}

// Chunks found but no tenant AI config → fall back to the first chunk text, so the
// contact still gets a grounded answer (never an empty/error reply).
func TestKnowledgeExecutor_NonEmpty_NoAIConfig_FallsBackToChunk(t *testing.T) {
	retr := &fakeRetriever{chunks: []RetrievedChunk{{Text: "Funciona das 9h as 18h.", SourceID: 7, Citation: "source:7"}}}
	st, adapter := newKnowledgeState(t, retr, "horario")

	out, err := knowledgeExecutor{}.Execute(context.Background(), st, knowledgeNode(1))
	require.NoError(t, err)
	assert.Equal(t, OutcomeAdvance, out.Kind)

	bodies := adapter.bodies()
	require.Len(t, bodies, 1)
	assert.Equal(t, "Funciona das 9h as 18h.", bodies[0])
}

// No retriever / no base configured → advance silently (never abort the run).
func TestKnowledgeExecutor_NoRetriever_AdvancesNoSend(t *testing.T) {
	st, adapter := newKnowledgeState(t, nil, "horario")

	out, err := knowledgeExecutor{}.Execute(context.Background(), st, knowledgeNode(1))
	require.NoError(t, err)
	assert.Equal(t, OutcomeAdvance, out.Kind)
	assert.Empty(t, adapter.bodies())
}

// Empty inbound → advance without querying or sending.
func TestKnowledgeExecutor_EmptyInbound_Advances(t *testing.T) {
	retr := &fakeRetriever{chunks: []RetrievedChunk{{Text: "x"}}}
	st, adapter := newKnowledgeState(t, retr, "")

	out, err := knowledgeExecutor{}.Execute(context.Background(), st, knowledgeNode(1))
	require.NoError(t, err)
	assert.Equal(t, OutcomeAdvance, out.Kind)
	assert.Empty(t, adapter.bodies())
	assert.Equal(t, "", retr.lastQuery)
}
