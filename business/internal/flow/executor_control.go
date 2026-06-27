package flow

import (
	"context"
	"encoding/json"
)

// startExecutor handles the entry node ("start"/"input"/"trigger"). It is pure
// control flow: it advances to the next node. The trigger itself was already
// matched upstream (projected columns / resume-first), so there is nothing to
// evaluate here.
type startExecutor struct{}

func (startExecutor) Type() string { return string(NodeStart) }

func (startExecutor) Execute(_ context.Context, _ *ExecState, _ Node) (Outcome, error) {
	return Outcome{Kind: OutcomeAdvance}, nil
}

// endData is the "end" node envelope (EndForm.tsx): endAction ∈
// {none,closeTicket,transferQueue,sendMessage}, endMessage carries the optional
// farewell text.
type endData struct {
	EndAction  string `json:"endAction"`
	EndMessage string `json:"endMessage"`
}

// endExecutor terminates the run. When endAction=="sendMessage" it sends the
// farewell text through the whatsapp adapter first, then ends.
type endExecutor struct{}

func (endExecutor) Type() string { return string(NodeEnd) }

func (endExecutor) Execute(ctx context.Context, st *ExecState, node Node) (Outcome, error) {
	var d endData
	if len(node.Data) > 0 {
		_ = json.Unmarshal(node.Data, &d)
	}

	if d.EndAction == "sendMessage" && d.EndMessage != "" {
		body := applyVars(st, d.EndMessage)
		if err := sendWhatsApp(ctx, st, node.ID, body, nil); err != nil {
			return Outcome{}, err
		}
	}
	return Outcome{Kind: OutcomeEnd, Detail: d.EndAction}, nil
}
