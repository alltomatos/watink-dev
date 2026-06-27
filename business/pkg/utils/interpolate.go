package utils

import "strings"

// InterpolateVariables replaces every {{key}} token in text with its mapped
// value. A missing variable simply leaves no replacement (the caller is
// expected to seed empty strings for absent values → ausência vira "").
//
// Shared by QuickAnswers dispatch and the FlowBuilder interpreter so both
// resolve {{contact_name}}, {{ticket_id}}, {{agent_name}}, {{company_name}}
// (and any custom run var) identically.
func InterpolateVariables(text string, vars map[string]string) string {
	for k, v := range vars {
		text = strings.ReplaceAll(text, "{{"+k+"}}", v)
	}
	return text
}
