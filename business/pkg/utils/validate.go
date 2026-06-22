package utils

import (
	"fmt"
	"strings"
)

// ValidateStringField trims the value and checks that it does not exceed maxLen bytes.
// Returns the trimmed value and an error if the trimmed value exceeds maxLen.
// maxLen == 0 means no length limit is enforced (only trimming occurs).
func ValidateStringField(val string, fieldName string, maxLen int) (string, error) {
	trimmed := strings.TrimSpace(val)
	if maxLen > 0 && len(trimmed) > maxLen {
		return "", fmt.Errorf("field '%s' exceeds maximum length of %d characters", fieldName, maxLen)
	}
	return trimmed, nil
}
