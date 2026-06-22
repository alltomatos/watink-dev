package utils

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ParseIntParam extracts a named path parameter as int, writes 400 and returns false on failure.
func ParseIntParam(c *gin.Context, name string) (int, bool) {
	raw := c.Param(name)
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid %s", name)})
		return 0, false
	}
	return v, true
}

func RespondWithError(c *gin.Context, code int, err error, message string) {
	slog.Error("API error",
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
		"status", code,
		"error", err.Error(),
		"client_message", message,
	)
	c.JSON(code, gin.H{"error": message})
}

func RespondWithBindError(c *gin.Context, err error) {
	if c != nil {
		slog.Warn("Request validation failed",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"error", err.Error(),
			"client_message", "Invalid request format or missing required fields",
		)
	} else {
		slog.Warn("Request validation failed (nil context)", "error", err.Error())
	}
	c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format or missing required fields"})
}

func RespondWithInternalError(c *gin.Context, err error, context string) {
	if c != nil {
		slog.Error("Internal server error",
			"context", context,
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"error", err.Error(),
		)
	} else {
		slog.Error("Internal server error (nil context)", "context", context, "error", err.Error())
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error. Please try again later."})
}

func RespondWithServiceError(c *gin.Context, code int, err error, safeMessage string) {
	if c != nil {
		slog.Error("Service error",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", code,
			"error", err.Error(),
			"client_message", safeMessage,
		)
	} else {
		slog.Error("Service error (nil context)", "status", code, "error", err.Error())
	}
	c.JSON(code, gin.H{"error": safeMessage})
}

func LogOnlyError(c *gin.Context, err error, context string) {
	if c != nil {
		slog.Error("Non-critical error",
			"context", context,
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"error", err.Error(),
		)
	} else {
		slog.Error("Non-critical error (nil context)", "context", context, "error", err.Error())
	}
}
