package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel/trace"
)

// ObservabilityMiddleware registra log estruturado por request com latência e trace_id.
func ObservabilityMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		c.Next()

		latencyMs := time.Since(start).Milliseconds()
		status := c.Writer.Status()
		method := c.Request.Method
		clientIP := c.ClientIP()
		traceID := trace.SpanContextFromContext(c.Request.Context()).TraceID().String()

		slog.Info("request",
			"method", method,
			"path", path,
			"status", status,
			"latency_ms", latencyMs,
			"ip", clientIP,
			"trace_id", traceID,
		)
	}
}
