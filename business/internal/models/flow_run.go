package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// FlowRun states. interactive and non-interactive runs are the SAME record,
// suspended at different points of the graph (ADR 0011).
const (
	FlowRunStatusRunning        = "running"
	FlowRunStatusWaitingMessage = "waiting_message"
	FlowRunStatusWaitingUntil   = "waiting_until"
	FlowRunStatusWaitingEvent   = "waiting_event"
	FlowRunStatusCompleted      = "completed"
	FlowRunStatusAborted        = "aborted"
	FlowRunStatusExpired        = "expired"
)

// FlowRun subject types.
const (
	FlowRunSubjectTicket  = "ticket"
	FlowRunSubjectContact = "contact"
	FlowRunSubjectNone    = "none"
)

// FlowRun is the unified runtime instance of a flow graph in progress.
// It runs the GraphSnapshot captured at start — editing the source Flow does
// NOT mutate live runs (ADR 0011/0013). RLS is INERT in the worker, so every
// query carries WHERE tenantId manually and writes use Session(NewDB:true).
type FlowRun struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID uuid.UUID `gorm:"column:tenantId;type:uuid;not null;index" json:"tenantId"`
	FlowID   int       `gorm:"column:flowId;not null" json:"flowId"`

	// CurrentNodeID is the node where execution is paused/running.
	CurrentNodeID string `gorm:"column:currentNodeId" json:"currentNodeId"`

	// Status is one of the FlowRunStatus* constants.
	Status string `gorm:"column:status;not null;default:running" json:"status"`

	// SubjectType / SubjectID bind the run to a ticket/contact (or none).
	SubjectType string     `gorm:"column:subjectType;not null;default:none" json:"subjectType"`
	SubjectID   *uuid.UUID `gorm:"column:subjectId;type:uuid" json:"subjectId,omitempty"`

	// TicketID is the int FK to the bound ticket (Ticket.ID is int, SubjectID is
	// uuid, so this column drives the resume-first lookup by (tenantId,ticketId)).
	TicketID *int `gorm:"column:ticketId" json:"ticketId,omitempty"`

	// Vars holds the interpolable variable state of the run (JSONB).
	Vars datatypes.JSON `gorm:"column:vars;type:jsonb" json:"vars"`

	// ResumeAt is set only in waiting_until (delay/cron); swept by the scheduler.
	ResumeAt *time.Time `gorm:"column:resumeAt" json:"resumeAt,omitempty"`

	// ExpiresAt is the TTL of the run (cleanup of orphan runs). Mandatory at start.
	ExpiresAt *time.Time `gorm:"column:expiresAt" json:"expiresAt,omitempty"`

	// GraphSnapshot is the FlowGraph frozen at start — the run executes the
	// version that started it, not the current edited Flow.
	GraphSnapshot datatypes.JSON `gorm:"column:graphSnapshot;type:jsonb" json:"graphSnapshot"`

	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (FlowRun) TableName() string {
	return "FlowRuns"
}
