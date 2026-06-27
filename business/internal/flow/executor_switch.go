package flow

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/alltomatos/watinkdev/business/internal/models"
	"gorm.io/gorm"
)

// switchCondition mirrors the ConditionBuilder row: field/operator/value with an
// optional AND/OR logic joiner (applied between this row and the previous one).
type switchCondition struct {
	Field    string `json:"field"`
	Operator string `json:"operator"`
	Value    string `json:"value"`
	Logic    string `json:"logic"`
}

// switchData is the "switch" node envelope (SwitchForm.tsx): conditionsA decides
// the green/true branch (handle "a"); otherwise the red/false branch (handle
// "b") — matching SwitchNode.tsx's two source handles.
type switchData struct {
	ConditionsA []switchCondition `json:"conditionsA"`
}

// switchExecutor evaluates conditionsA against the run state and branches:
// true → handle "a", false → handle "b".
type switchExecutor struct{}

func (switchExecutor) Type() string { return string(NodeSwitch) }

func (switchExecutor) Execute(_ context.Context, st *ExecState, node Node) (Outcome, error) {
	var d switchData
	if len(node.Data) > 0 {
		_ = json.Unmarshal(node.Data, &d)
	}

	if evalConditions(st, d.ConditionsA) {
		return Outcome{Kind: OutcomeAdvance, Handle: "a", Detail: "true"}, nil
	}
	return Outcome{Kind: OutcomeAdvance, Handle: "b", Detail: "false"}, nil
}

// evalConditions evaluates the AND/OR chain of conditions. An empty set is true
// (no constraint). The logic joiner on each row (from the 2nd onward) combines
// it with the running result; AND/OR are evaluated left-to-right (no precedence,
// matching the linear ConditionBuilder UI).
func evalConditions(st *ExecState, conds []switchCondition) bool {
	if len(conds) == 0 {
		return true
	}
	result := evalOne(st, conds[0])
	for _, c := range conds[1:] {
		v := evalOne(st, c)
		if strings.EqualFold(c.Logic, "OR") {
			result = result || v
		} else {
			result = result && v
		}
	}
	return result
}

// evalOne evaluates a single condition against the resolved field value.
func evalOne(st *ExecState, c switchCondition) bool {
	actual := resolveField(st, c.Field)
	expected := c.Value

	la := strings.ToLower(strings.TrimSpace(actual))
	le := strings.ToLower(strings.TrimSpace(expected))

	switch c.Operator {
	case "equals":
		return la == le
	case "notEquals":
		return la != le
	case "contains":
		return strings.Contains(la, le)
	case "notContains":
		return !strings.Contains(la, le)
	case "startsWith":
		return strings.HasPrefix(la, le)
	case "endsWith":
		return strings.HasSuffix(la, le)
	case "isEmpty":
		return strings.TrimSpace(actual) == ""
	case "isNotEmpty":
		return strings.TrimSpace(actual) != ""
	case "greaterThan":
		return numericCompare(actual, expected) > 0
	case "lessThan":
		return numericCompare(actual, expected) < 0
	default:
		return false
	}
}

// resolveField maps a ConditionBuilder field name to a value from the run state.
// Every field the ConditionBuilder.tsx UI offers is handled here so a condition
// the user could author never falls through to a silent "" mismatch. Unknown
// fields try the run var map, then resolve to empty.
func resolveField(st *ExecState, field string) string {
	switch field {
	case "lastInput":
		return st.Inbound
	case "contactName":
		if st.Contact != nil {
			return st.Contact.Name
		}
	case "contactNumber":
		if st.Contact != nil {
			return st.Contact.Number
		}
	case "ticketStatus":
		if st.Ticket != nil {
			return st.Ticket.Status
		}
	case "dayOfWeek":
		// Matches the frontend PREDEFINED_VALUES: 0=Sunday … 6=Saturday.
		return strconv.Itoa(int(time.Now().Weekday()))
	case "currentHour":
		return strconv.Itoa(time.Now().Hour())
	case "queueName":
		return resolveQueueName(st)
	case "tagName":
		return resolveContactTags(st)
	}
	if st.Vars != nil {
		if v, ok := st.Vars[field]; ok {
			return v
		}
	}
	return ""
}

// resolveQueueName looks up the run ticket's queue name, tenant-scoped (RLS inert
// in the worker → manual WHERE "tenantId"). Empty when the ticket has no queue or
// no DB is wired.
func resolveQueueName(st *ExecState) string {
	if st.DB == nil || st.Ticket == nil || st.Ticket.QueueID == nil {
		return ""
	}
	var q models.Queue
	err := st.DB.Session(&gorm.Session{NewDB: true}).
		Where(`"tenantId" = ? AND id = ?`, st.TenantID, *st.Ticket.QueueID).
		First(&q).Error
	if err != nil {
		return ""
	}
	return q.Name
}

// resolveContactTags returns the run contact's tag names as a comma-joined,
// lowercased list (so a `contains`/`equals` condition matches a single tag),
// tenant-scoped via EntityTags(entityType="contact"). Empty when no contact/DB
// or no tags.
func resolveContactTags(st *ExecState) string {
	if st.DB == nil || st.Contact == nil {
		return ""
	}
	var names []string
	err := st.DB.Session(&gorm.Session{NewDB: true}).
		Table(`"Tags" t`).
		Joins(`JOIN "EntityTags" et ON et."tagId" = t.id`).
		Where(`et."tenantId" = ? AND et."entityType" = ? AND et."entityId" = ?`,
			st.TenantID, "contact", st.Contact.ID).
		Pluck("t.name", &names).Error
	if err != nil {
		return ""
	}
	return strings.ToLower(strings.Join(names, ","))
}

// numericCompare parses both operands as floats; returns -1/0/1. Non-numeric
// operands fall back to a string compare so the operator still behaves sanely.
func numericCompare(a, b string) int {
	fa, ea := strconv.ParseFloat(strings.TrimSpace(a), 64)
	fb, eb := strconv.ParseFloat(strings.TrimSpace(b), 64)
	if ea == nil && eb == nil {
		switch {
		case fa < fb:
			return -1
		case fa > fb:
			return 1
		default:
			return 0
		}
	}
	return strings.Compare(strings.TrimSpace(a), strings.TrimSpace(b))
}
