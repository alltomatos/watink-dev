package middleware

import (
	"log"
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

		log.Printf("event=request method=%s path=%s status=%d latency_ms=%d ip=%s trace_id=%s", method, path, status, latencyMs, clientIP, traceID)
	}
}
