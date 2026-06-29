package flow

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// menuOption mirrors the frontend option shape ({id,label}) authored in
// MenuForm.tsx.
type menuOption struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

// menuData is the "menu" node envelope: menuTitle prompt + the numbered options.
type menuData struct {
	MenuTitle string       `json:"menuTitle"`
	Options   []menuOption `json:"options"`
}

// menuExecutor presents a numbered menu and suspends; on resume it matches the
// reply (a number, or the option label/id text) to an option and advances via
// that option's branch.
//
// Branch resolution: the canvas emits one default source handle on a menu node,
// so per-option edges are matched by sourceHandle ∈ {opt-<1-based index>,
// option-<id>, <id>}. If no per-option edge exists, the single default outgoing
// edge is taken (linear menu). An unmatched reply re-prompts (suspend again).
type menuExecutor struct{}

func (menuExecutor) Type() string { return string(NodeMenu) }

func (menuExecutor) Execute(_ context.Context, st *ExecState, node Node) (Outcome, error) {
	var d menuData
	if len(node.Data) > 0 {
		_ = json.Unmarshal(node.Data, &d)
	}

	// Resume path: this menu is exactly where the run was suspended, so the
	// inbound is its reply → match it to an option. A menu reached fresh in the
	// same pass (node.ID != ResumeNodeID) always presents instead.
	if node.ID == st.ResumeNodeID {
		reply := strings.TrimSpace(st.Inbound)
		idx, opt, ok := matchMenuOption(d.Options, reply)
		if !ok {
			// Unrecognized reply: re-send the menu and wait again. The reprompt
			// MUST use a fresh EnvID per attempt — reusing the first
			// presentation's per-node EnvID would hit the adapter's 24h dedup
			// lock and silently no-op, trapping the run in waiting_message until
			// TTL. Bump a per-node attempt counter and fold it into the EnvID.
			attempt := bumpMenuAttempt(st, node.ID)
			if err := sendMenuAttempt(st, node, d, strconv.Itoa(attempt)); err != nil {
				return Outcome{}, err
			}
			return Outcome{Kind: OutcomeSuspend, Detail: "reprompt: unmatched reply"}, nil
		}
		// Record the chosen option as a run variable for downstream nodes.
		if st.Vars != nil {
			st.Vars["menu_choice"] = opt.ID
			st.Vars["menu_choice_label"] = opt.Label
		}
		handle := menuHandle(idx, opt)
		return Outcome{Kind: OutcomeAdvance, Handle: handle, Detail: "option " + opt.ID}, nil
	}

	// First entry: present the menu and suspend until the user replies.
	if err := sendMenu(st, node, d); err != nil {
		return Outcome{}, err
	}
	return Outcome{Kind: OutcomeSuspend, WaitStatus: "", Detail: "menu presented"}, nil
}

// sendMenu renders the numbered menu text and sends it via the whatsapp adapter,
// keyed by the node id (first presentation — redelivery-safe).
func sendMenu(st *ExecState, node Node, d menuData) error {
	return sendMenuAttempt(st, node, d, "")
}

// sendMenuAttempt is sendMenu with an EnvID suffix so a reprompt (suffix =
// attempt number) is a distinct idempotency key and is not swallowed by the
// adapter dedup lock held from the first presentation. An empty suffix == the
// per-node key (first presentation).
func sendMenuAttempt(st *ExecState, node Node, d menuData, suffix string) error {
	var b strings.Builder
	if title := applyVars(st, d.MenuTitle); title != "" {
		b.WriteString(title)
		b.WriteString("\n\n")
	}
	for i, opt := range d.Options {
		fmt.Fprintf(&b, "%d. %s\n", i+1, applyVars(st, opt.Label))
	}
	env := envIDWithSuffix(st, node.ID, suffix)
	return sendWhatsAppEnv(context.Background(), st, env, strings.TrimRight(b.String(), "\n"), nil)
}

// bumpMenuAttempt increments and returns the per-node reprompt counter stored in
// the run vars. It persists across resumes because st.Vars is written back into
// Run.Vars, so each invalid reply yields a strictly increasing attempt number
// (and thus a unique reprompt EnvID), even across separate inbound deliveries.
func bumpMenuAttempt(st *ExecState, nodeID string) int {
	if st.Vars == nil {
		st.Vars = map[string]string{}
	}
	key := "menu_attempts:" + nodeID
	n, _ := strconv.Atoi(st.Vars[key])
	n++
	st.Vars[key] = strconv.Itoa(n)
	return n
}

// matchMenuOption resolves a reply to an option: by 1-based number first, then
// by case-insensitive exact label or id. Returns the zero-based index.
func matchMenuOption(options []menuOption, reply string) (int, menuOption, bool) {
	r := strings.TrimSpace(reply)
	if n, err := strconv.Atoi(r); err == nil {
		if n >= 1 && n <= len(options) {
			return n - 1, options[n-1], true
		}
	}
	lower := strings.ToLower(r)
	for i, opt := range options {
		if strings.ToLower(strings.TrimSpace(opt.Label)) == lower || strings.ToLower(opt.ID) == lower {
			return i, opt, true
		}
	}
	return 0, menuOption{}, false
}

// menuHandle returns the candidate sourceHandle for a matched option. The
// interpreter's nextNode falls back to the default edge if this handle has no
// matching edge, so returning a structured guess is safe.
func menuHandle(idx int, opt menuOption) string {
	if opt.ID != "" {
		return "option-" + opt.ID
	}
	return "opt-" + strconv.Itoa(idx+1)
}
