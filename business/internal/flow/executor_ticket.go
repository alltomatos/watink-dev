package flow

import (
	"context"
	"encoding/json"
	"strconv"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"gorm.io/gorm"
)

// ticketData is the "ticket" node envelope (TicketForm.tsx): ticketAction ∈
// {moveToQueue,assignUser,changeStatus} with the matching target id/status.
type ticketData struct {
	TicketAction string `json:"ticketAction"`
	NewStatus    string `json:"newStatus"`
	QueueID      string `json:"queueId"`
	UserID       string `json:"userId"`
}

// ticketExecutor is the minimal handoff for FASE 1: it mutates the bound ticket
// (move to queue / assign user / change status) so the conversation lands with a
// human, then advances. Full handoff orchestration is FASE 2.
//
// Writes use Session(NewDB) + manual WHERE "tenantId" (RLS inert in worker).
type ticketExecutor struct{}

func (ticketExecutor) Type() string { return string(NodeTicket) }

func (ticketExecutor) Execute(ctx context.Context, st *ExecState, node Node) (Outcome, error) {
	var d ticketData
	if len(node.Data) > 0 {
		_ = json.Unmarshal(node.Data, &d)
	}

	// No ticket bound or no DB → nothing to mutate; advance (control-only).
	if st.Ticket == nil || st.DB == nil {
		return Outcome{Kind: OutcomeAdvance, Detail: "no ticket/db"}, nil
	}

	updates := map[string]interface{}{"updatedAt": time.Now()}
	detail := d.TicketAction

	switch d.TicketAction {
	case "changeStatus":
		if d.NewStatus != "" {
			updates["status"] = d.NewStatus
		}
	case "moveToQueue":
		if qid, err := strconv.Atoi(d.QueueID); err == nil {
			updates["queueId"] = qid
		}
		// Moving to a queue is a handoff signal: leave it pending for an agent.
		updates["status"] = "pending"
	case "assignUser":
		if uid, err := strconv.Atoi(d.UserID); err == nil {
			updates["userId"] = uid
			updates["status"] = "open"
		}
	default:
		// Unknown/no action — advance without writing.
		return Outcome{Kind: OutcomeAdvance, Detail: "noop"}, nil
	}

	if len(updates) <= 1 { // only updatedAt → nothing meaningful to write
		return Outcome{Kind: OutcomeAdvance, Detail: "noop"}, nil
	}

	err := st.DB.Session(&gorm.Session{NewDB: true}).
		WithContext(ctx).
		Model(&models.Ticket{}).
		Where(`"tenantId" = ? AND id = ?`, st.TenantID, st.Ticket.ID).
		Updates(updates).Error
	if err != nil {
		return Outcome{}, err
	}
	return Outcome{Kind: OutcomeAdvance, Detail: detail}, nil
}
