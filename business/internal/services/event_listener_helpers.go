package services

import (
	"strconv"
	"strings"
)

// getSessionID extracts a numeric session ID from strings in the format
// "tenantUUID-sessionInt" or plain integer strings (legacy format).
func getSessionID(id string) int {
	if strings.Contains(id, "-") {
		parts := strings.Split(id, "-")
		val, _ := strconv.Atoi(parts[len(parts)-1])
		return val
	}
	val, _ := strconv.Atoi(id)
	return val
}
