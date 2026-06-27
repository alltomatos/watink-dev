package flow

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// maxSteps caps the number of nodes a single interpreter pass may advance
// through, guarding against cyclic graphs (a→b→a) blowing the stack/looping
// forever. A real flow rarely chains this many synchronous nodes before
// suspending or ending.
const maxSteps = 100

// Interpreter walks a FlowRun's frozen GraphSnapshot, executing one node at a
// time and following edges (by sourceHandle for branches) until the run
// suspends (waiting_message) or ends. It is constructed via DI with the executor
// registry; per-run state lives in ExecState (never on the interpreter).
//
// Writes use Session(NewDB:true) and carry WHERE "tenantId" manually — RLS is
// inert in this worker path (ADR 0001).
type Interpreter struct {
	executors *ExecutorRegistry
	channels  *ChannelRegistry
	db        *gorm.DB
}

// NewInterpreter wires the interpreter (DI pura — no global).
func NewInterpreter(executors *ExecutorRegistry, channels *ChannelRegistry, db *gorm.DB) *Interpreter {
	return &Interpreter{executors: executors, channels: channels, db: db}
}

// Run executes the run starting at its CurrentNodeID. inbound is the message
// body that triggered/resumed this pass (empty on a no-body start). The run's
// status/CurrentNodeID/Vars are persisted as it advances; a terminal state is
// completed, a suspend is waiting_message.
func (ip *Interpreter) Run(ctx context.Context, st *ExecState) error {
	if st == nil || st.Run == nil {
		return fmt.Errorf("interpreter: nil run state")
	}
	st.Registry = ip.channels
	st.DB = ip.db

	nodeID := st.Run.CurrentNodeID
	if nodeID == "" {
		// Fresh run with no current node — start at the entry node.
		entry, ok := entryNode(st.Graph)
		if !ok {
			return fmt.Errorf("interpreter: graph has no entry node")
		}
		nodeID = entry.ID
	}

	for steps := 0; steps < maxSteps; steps++ {
		node, ok := findNode(st.Graph, nodeID)
		if !ok {
			return ip.fail(ctx, st, nodeID, "", fmt.Errorf("node %q not found in snapshot", nodeID))
		}

		exec, err := ip.executors.MustGet(node.Type)
		if err != nil {
			return ip.fail(ctx, st, node.ID, node.Type, err)
		}

		ip.logStep(ctx, st, node.ID, node.Type, "enter", "")

		outcome, err := exec.Execute(ctx, st, node)
		if err != nil {
			return ip.fail(ctx, st, node.ID, node.Type, err)
		}

		switch outcome.Kind {
		case OutcomeSuspend:
			status := outcome.WaitStatus
			if status == "" {
				status = models.FlowRunStatusWaitingMessage
			}
			ip.logStep(ctx, st, node.ID, node.Type, "suspend", outcome.Detail)
			return ip.persist(ctx, st, node.ID, status)

		case OutcomeEnd:
			ip.logStep(ctx, st, node.ID, node.Type, "complete", outcome.Detail)
			return ip.persist(ctx, st, node.ID, models.FlowRunStatusCompleted)

		case OutcomeAdvance:
			next, ok := nextNode(st.Graph, node.ID, outcome.Handle)
			if !ok {
				// No outgoing edge — a dangling node terminates the run cleanly.
				ip.logStep(ctx, st, node.ID, node.Type, "complete", "no outgoing edge")
				return ip.persist(ctx, st, node.ID, models.FlowRunStatusCompleted)
			}
			ip.logStep(ctx, st, node.ID, node.Type, "advance", outcome.Detail)
			nodeID = next
			// Inbound is consumed by the first node that reads it (resume); a
			// subsequent menu/switch in the same pass should not re-match it.
			st.Inbound = ""

		default:
			return ip.fail(ctx, st, node.ID, node.Type, fmt.Errorf("unknown outcome kind %d", outcome.Kind))
		}
	}

	// Loop guard tripped: persist as aborted to break the cycle, not silently.
	ip.logStep(ctx, st, nodeID, "", "abort", "max steps exceeded (loop guard)")
	return ip.persist(ctx, st, nodeID, models.FlowRunStatusAborted)
}

// fail logs the error step and persists the run as aborted, returning the error.
func (ip *Interpreter) fail(ctx context.Context, st *ExecState, nodeID, nodeType string, cause error) error {
	ip.logStep(ctx, st, nodeID, nodeType, "error", cause.Error())
	_ = ip.persist(ctx, st, nodeID, models.FlowRunStatusAborted)
	return cause
}

// persist writes the run's current node, status and vars back. Session(NewDB)
// + manual WHERE "tenantId" (RLS inert in worker).
func (ip *Interpreter) persist(ctx context.Context, st *ExecState, nodeID, status string) error {
	st.Run.CurrentNodeID = nodeID
	st.Run.Status = status

	varsJSON, err := json.Marshal(st.Vars)
	if err != nil {
		varsJSON = []byte("{}")
	}

	updates := map[string]interface{}{
		"currentNodeId": nodeID,
		"status":        status,
		"vars":          varsJSON,
		"updatedAt":     time.Now(),
	}

	if ip.db == nil {
		return nil
	}
	return ip.db.Session(&gorm.Session{NewDB: true}).
		WithContext(ctx).
		Model(&models.FlowRun{}).
		Where(`"tenantId" = ? AND id = ?`, st.TenantID, st.Run.ID).
		Updates(updates).Error
}

// logStep appends a FlowRunLog row (best-effort — a log failure never aborts a
// run). Session(NewDB) + explicit tenantId.
func (ip *Interpreter) logStep(ctx context.Context, st *ExecState, nodeID, nodeType, action, detail string) {
	if ip.db == nil {
		return
	}
	entry := models.FlowRunLog{
		ID:        uuid.New(),
		TenantID:  st.TenantID,
		FlowRunID: st.Run.ID,
		NodeID:    nodeID,
		NodeType:  nodeType,
		Action:    action,
		Detail:    detail,
		CreatedAt: time.Now(),
	}
	if err := ip.db.Session(&gorm.Session{NewDB: true}).WithContext(ctx).Create(&entry).Error; err != nil {
		log.Printf("[FlowInterpreter] log step failed (run=%s node=%s): %v", st.Run.ID, nodeID, err)
	}
}

// findNode returns the node with the given id from the snapshot.
func findNode(g FlowGraph, id string) (Node, bool) {
	for i := range g.Nodes {
		if g.Nodes[i].ID == id {
			return g.Nodes[i], true
		}
	}
	return Node{}, false
}

// nextNode resolves the target of the outgoing edge from source. When handle is
// non-empty it prefers the edge whose sourceHandle matches; if no handle-matched
// edge exists it falls back to an edge with an empty handle (the default path).
// When handle is empty it takes the first outgoing edge.
func nextNode(g FlowGraph, source, handle string) (string, bool) {
	var fallback string
	haveFallback := false
	for i := range g.Edges {
		e := g.Edges[i]
		if e.Source != source {
			continue
		}
		if handle != "" {
			if e.Handle == handle {
				return e.Target, true
			}
			if e.Handle == "" && !haveFallback {
				fallback, haveFallback = e.Target, true
			}
			continue
		}
		// No handle requested: first outgoing edge wins.
		return e.Target, true
	}
	if haveFallback {
		return fallback, true
	}
	return "", false
}
