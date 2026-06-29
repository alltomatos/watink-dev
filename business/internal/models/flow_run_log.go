package models

import (
	"time"

	"github.com/google/uuid"
)

// FlowRunLog is the minimal observability trail for a FlowRun: one row per
// node-execution step taken by the interpreter (entered, sent, suspended,
// branched, completed, etc.). It is append-only and tenant-scoped.
//
// RLS is INERT in the worker, so every read/write carries WHERE "tenantId"
// manually and writes use Session(NewDB:true).
type FlowRunLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TenantID  uuid.UUID `gorm:"column:tenantId;type:uuid;not null;index" json:"tenantId"`
	FlowRunID uuid.UUID `gorm:"column:flowRunId;type:uuid;not null;index" json:"flowRunId"`

	// NodeID / NodeType identify the graph node this step touched.
	NodeID   string `gorm:"column:nodeId" json:"nodeId"`
	NodeType string `gorm:"column:nodeType" json:"nodeType"`

	// Action is the step verb (enter | send | suspend | branch | advance |
	// complete | error | start | resume | abort | expire).
	Action string `gorm:"column:action" json:"action"`

	// Detail is a free-form human-readable note (matched option, error text...).
	Detail string `gorm:"column:detail" json:"detail"`

	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
}

func (FlowRunLog) TableName() string {
	return "FlowRunLogs"
}
