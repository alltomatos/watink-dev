package flow

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
)

// agentHandoffMessage is the single line sent to the contact before a handoff
// (max-turns reached, transport error, or the brain asking for a human).
const agentHandoffMessage = "Vou transferir você para um atendente."

// agentData is the "agent" node envelope (AgentForm.tsx): knowledgeBaseId selects
// the base the agent answers from; persona is the system prompt/personality;
// maxTurns caps how many user turns the agent handles before forcing a handoff.
type agentData struct {
	KnowledgeBaseID int    `json:"knowledgeBaseId"`
	Persona         string `json:"persona"`
	MaxTurns        int    `json:"maxTurns"`
}

// agentExecutor runs a multi-turn RAG agent node. On each inbound it appends the
// user message to the per-node history, asks the brain (Responder) for a reply,
// sends it back, and persists the updated history. The brain's action decides the
// outcome: "resolved" advances the default branch, "handoff" advances the
// "handoff" branch, and "continue" suspends (waiting_message) for the next turn.
//
// Degradation is graceful: a missing base/responder/question advances silently;
// a transport error or the turn cap sends a handoff line and takes the handoff
// branch. The run is never aborted by this node.
type agentExecutor struct{}

func (agentExecutor) Type() string { return string(NodeAgent) }

func (agentExecutor) Execute(ctx context.Context, st *ExecState, node Node) (Outcome, error) {
	var d agentData
	if len(node.Data) > 0 {
		_ = json.Unmarshal(node.Data, &d)
	}

	maxTurns := d.MaxTurns
	if maxTurns <= 0 {
		maxTurns = 10
	}

	if d.KnowledgeBaseID == 0 || st.Responder == nil {
		return Outcome{Kind: OutcomeAdvance, Detail: "agent: sem base/responder"}, nil
	}

	query := strings.TrimSpace(st.Inbound)
	if query == "" {
		return Outcome{Kind: OutcomeAdvance, Detail: "agent: sem pergunta"}, nil
	}

	history := loadAgentHistory(st, node.ID)

	// Turn cap: count user turns already in the history. At/over the cap, force a
	// handoff before spending another LLM call.
	userTurns := 0
	for _, h := range history {
		if h.Role == "user" {
			userTurns++
		}
	}
	if userTurns >= maxTurns {
		turn := bumpAgentTurn(st, node.ID)
		_ = sendWhatsAppEnv(ctx, st, envIDWithSuffix(st, node.ID, "t"+strconv.Itoa(turn)), agentHandoffMessage, nil)
		return Outcome{Kind: OutcomeAdvance, Handle: "handoff", Detail: "agent: max turns"}, nil
	}

	history = append(history, AgentTurn{Role: "user", Content: query})

	reply, err := st.Responder.Respond(ctx, st.TenantID, d.KnowledgeBaseID, d.Persona, history, query)
	if err != nil {
		turn := bumpAgentTurn(st, node.ID)
		_ = sendWhatsAppEnv(ctx, st, envIDWithSuffix(st, node.ID, "t"+strconv.Itoa(turn)), agentHandoffMessage, nil)
		return Outcome{Kind: OutcomeAdvance, Handle: "handoff", Detail: "agent: erro"}, nil
	}

	// Send the agent's reply with a per-turn unique EnvID so multiple turns of the
	// same node are not collapsed by the adapter's 24h dedup lock.
	turn := bumpAgentTurn(st, node.ID)
	if err := sendWhatsAppEnv(ctx, st, envIDWithSuffix(st, node.ID, "t"+strconv.Itoa(turn)), reply.Reply, nil); err != nil {
		return Outcome{}, err
	}

	history = append(history, AgentTurn{Role: "assistant", Content: reply.Reply})
	saveAgentHistory(st, node.ID, history)

	switch reply.Action {
	case "resolved":
		return Outcome{Kind: OutcomeAdvance, Detail: "agent: resolvido"}, nil
	case "handoff":
		return Outcome{Kind: OutcomeAdvance, Handle: "handoff", Detail: "agent: handoff"}, nil
	default: // "continue"
		return Outcome{Kind: OutcomeSuspend, Detail: "agent: aguardando"}, nil
	}
}

// agentHistoryKey is the per-node run-var key holding the JSON-encoded history.
func agentHistoryKey(nodeID string) string { return "agent_history:" + nodeID }

// loadAgentHistory reads and decodes the per-node conversation history from the
// run vars. A missing/invalid entry yields an empty history (never an error) — the
// agent always re-answers the current inbound; the history only carries context.
func loadAgentHistory(st *ExecState, nodeID string) []AgentTurn {
	if st.Vars == nil {
		return nil
	}
	raw := st.Vars[agentHistoryKey(nodeID)]
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	var history []AgentTurn
	if err := json.Unmarshal([]byte(raw), &history); err != nil {
		return nil
	}
	return history
}

// saveAgentHistory JSON-encodes the history back into the run vars so it persists
// across resumes (st.Vars is written back into Run.Vars). A marshal error leaves
// the previous value untouched.
func saveAgentHistory(st *ExecState, nodeID string, history []AgentTurn) {
	if st.Vars == nil {
		st.Vars = map[string]string{}
	}
	b, err := json.Marshal(history)
	if err != nil {
		return
	}
	st.Vars[agentHistoryKey(nodeID)] = string(b)
}

// bumpAgentTurn increments and returns the per-node turn counter stored in the run
// vars. It persists across resumes (st.Vars → Run.Vars), so each turn yields a
// strictly increasing number and thus a unique outbound EnvID per turn.
func bumpAgentTurn(st *ExecState, nodeID string) int {
	if st.Vars == nil {
		st.Vars = map[string]string{}
	}
	key := "agent_turns:" + nodeID
	n, _ := strconv.Atoi(st.Vars[key])
	n++
	st.Vars[key] = strconv.Itoa(n)
	return n
}
