package flow

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestParseGraph_SchemaVersionDefaultsToV1 — absence of schemaVersion is v1, not an error.
func TestParseGraph_SchemaVersionDefaultsToV1(t *testing.T) {
	nodes := []byte(`[{"id":"a","type":"start","data":{}}]`)
	g, err := ParseGraph(nodes, nil)
	require.NoError(t, err)
	assert.Equal(t, 1, g.SchemaVersion)
	assert.NoError(t, g.Validate())
}

// TestParseGraph_WrappedObjectCarriesSchemaVersion — wrapped form keeps its version.
func TestParseGraph_WrappedObjectCarriesSchemaVersion(t *testing.T) {
	nodes := []byte(`{"schemaVersion":1,"nodes":[{"id":"a","type":"end","data":{}}]}`)
	g, err := ParseGraph(nodes, nil)
	require.NoError(t, err)
	assert.Equal(t, 1, g.SchemaVersion)
	assert.Len(t, g.Nodes, 1)
}

// TestValidate_OK — a well-formed graph with valid types and connected edges passes.
func TestValidate_OK(t *testing.T) {
	nodes := []byte(`[
		{"id":"start","type":"start","data":{}},
		{"id":"msg","type":"message","data":{}},
		{"id":"end","type":"end","data":{}}
	]`)
	edges := []byte(`[
		{"id":"e1","source":"start","target":"msg"},
		{"id":"e2","source":"msg","target":"end"}
	]`)
	g, err := ParseGraph(nodes, edges)
	require.NoError(t, err)
	assert.NoError(t, g.Validate())
}

// TestValidate_UnknownNodeType — an unregistered node.type is rejected.
func TestValidate_UnknownNodeType(t *testing.T) {
	nodes := []byte(`[{"id":"a","type":"sendMesage","data":{}}]`) // typo on purpose
	g, err := ParseGraph(nodes, nil)
	require.NoError(t, err)

	err = g.Validate()
	require.Error(t, err)
	var verr *ValidationError
	assert.True(t, errors.As(err, &verr), "expected a ValidationError")
	assert.Contains(t, err.Error(), "unknown node type")
}

// TestValidate_DuplicateNodeID — duplicate node ids are rejected.
func TestValidate_DuplicateNodeID(t *testing.T) {
	nodes := []byte(`[
		{"id":"dup","type":"start","data":{}},
		{"id":"dup","type":"end","data":{}}
	]`)
	g, err := ParseGraph(nodes, nil)
	require.NoError(t, err)

	err = g.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "duplicate node id")
}

// TestValidate_OrphanEdge — an edge pointing to a missing node is rejected.
func TestValidate_OrphanEdge(t *testing.T) {
	nodes := []byte(`[{"id":"a","type":"start","data":{}}]`)
	edges := []byte(`[{"id":"e1","source":"a","target":"ghost"}]`)
	g, err := ParseGraph(nodes, edges)
	require.NoError(t, err)

	err = g.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unknown target node")
}

// TestValidate_OrphanEdgeSource — an edge with a missing source is rejected.
func TestValidate_OrphanEdgeSource(t *testing.T) {
	nodes := []byte(`[{"id":"a","type":"end","data":{}}]`)
	edges := []byte(`[{"id":"e1","source":"ghost","target":"a"}]`)
	g, err := ParseGraph(nodes, edges)
	require.NoError(t, err)

	err = g.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unknown source node")
}

// TestValidate_UnknownSchemaVersion — a future schemaVersion is rejected distinctly.
func TestValidate_UnknownSchemaVersion(t *testing.T) {
	g := FlowGraph{SchemaVersion: CurrentSchemaVersion + 1}
	err := g.Validate()
	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrUnknownSchemaVersion))
}

// TestValidate_InputOutputAliases — canvas entry/exit aliases are accepted.
func TestValidate_InputOutputAliases(t *testing.T) {
	nodes := []byte(`[
		{"id":"in","type":"input","data":{}},
		{"id":"out","type":"output","data":{}}
	]`)
	edges := []byte(`[{"id":"e1","source":"in","target":"out"}]`)
	g, err := ParseGraph(nodes, edges)
	require.NoError(t, err)
	assert.NoError(t, g.Validate())
}

// TestValidate_EmptyGraphIsValid — a draft flow with no nodes can be saved.
func TestValidate_EmptyGraphIsValid(t *testing.T) {
	g, err := ParseGraph(nil, nil)
	require.NoError(t, err)
	assert.NoError(t, g.Validate())
}
