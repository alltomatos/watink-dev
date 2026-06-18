package health

import (
	"context"
	"log"
	"net/http"
	"os"
)

// Start launches a minimal HTTP health server on the configured port (default 8083).
// It blocks until ctx is cancelled, then shuts down gracefully.
func Start(ctx context.Context) {
	port := os.Getenv("HEALTH_PORT")
	if port == "" {
		port = "8083"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","service":"watink-engine"}`))
	})

	srv := &http.Server{Addr: ":" + port, Handler: mux}

	go func() {
		log.Printf("Health server listening on :%s/health", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Health server error: %v", err)
		}
	}()

	<-ctx.Done()
	_ = srv.Shutdown(context.Background())
	log.Println("Health server stopped")
}
