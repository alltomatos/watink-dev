package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"whaticket-engine-go/pkg/rabbitmq"
	"whaticket-engine-go/pkg/session"
)

func main() {
	log.Println("Starting Whaticket Engine Go (High Performance)...")

	amqpURL := os.Getenv("AMQP_URL")
	if amqpURL == "" {
		amqpURL = "amqp://***REMOVED_AMQP_CREDENTIALS***@localhost:5672"
	}

	mq := rabbitmq.NewClient(amqpURL)
	if err := mq.Connect(); err != nil {
		log.Fatalf("Fatal: %v", err)
	}
	defer mq.Close()

	mgr := session.NewManager(mq)

	go func() {
		if err := mq.ConsumeCommands(mgr.HandleCommand); err != nil {
			log.Fatalf("Consume error: %v", err)
		}
	}()

	// Wait for interrupt
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("Shutting down...")
}
