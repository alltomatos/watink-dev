package flow

import (
	"errors"
	"fmt"
)

// ErrUnknownSchemaVersion is returned when a graph declares a schemaVersion
// newer than this build understands. Absence (zero) is NOT an error — it
// defaults to v1 in ParseGraph.
var ErrUnknownSchemaVersion = errors.New("unknown schemaVersion")

// ValidationError carries a human-readable reason for a rejected graph. The
// controller maps it to HTTP 422.
type ValidationError struct {
	Reason string
}

func (e *ValidationError) Error() string { return e.Reason }

// newValidationError builds a *ValidationError with a formatted reason.
func newValidationError(format string, args ...any) *ValidationError {
	return &ValidationError{Reason: fmt.Sprintf(format, args...)}
}

// Validate enforces the structural contract of a FlowGraph (ADR 0013):
//   - schemaVersion must be known (absent = v1, handled before this call);
//   - node.id must be unique;
//   - node.type must be in the closed registry;
//   - every edge.source / edge.target must reference an existing node.id.
//
// It returns *ValidationError for any contract breach (→ 422) and
// ErrUnknownSchemaVersion for a future schema. A graph with no nodes is valid
// (an empty/draft flow can be saved during DEV).
func (g FlowGraph) Validate() error {
	if g.SchemaVersion > CurrentSchemaVersion {
		return ErrUnknownSchemaVersion
	}
	if g.SchemaVersion < 1 {
		// Defensive: callers should have defaulted to 1 via ParseGraph.
		return newValidationError("schemaVersion must be >= 1, got %d", g.SchemaVersion)
	}

	ids := make(map[string]struct{}, len(g.Nodes))
	for _, n := range g.Nodes {
		if n.ID == "" {
			return newValidationError("node with empty id is not allowed")
		}
		if _, dup := ids[n.ID]; dup {
			return newValidationError("duplicate node id %q", n.ID)
		}
		ids[n.ID] = struct{}{}

		if !IsValidNodeType(n.Type) {
			return newValidationError("unknown node type %q for node %q", n.Type, n.ID)
		}
	}

	for _, e := range g.Edges {
		if _, ok := ids[e.Source]; !ok {
			return newValidationError("edge %q references unknown source node %q", e.ID, e.Source)
		}
		if _, ok := ids[e.Target]; !ok {
			return newValidationError("edge %q references unknown target node %q", e.ID, e.Target)
		}
	}

	return nil
}
