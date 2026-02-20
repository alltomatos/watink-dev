package main

import (
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/alltomatos/watinkdev/engine-go/internal/rabbitmq"
	"github.com/alltomatos/watinkdev/engine-go/internal/whatsapp"
	"github.com/joho/godotenv"
	"github.com/streadway/amqp"
)

type StartCommandPayload struct {
	ProxyURL       string `json:"proxyUrl"`
	UsePairingCode bool   `json:"usePairingCode"`
	PhoneNumber    string `json:"phoneNumber"`
	Name           string `json:"name"`
}

type CommandEnvelope struct {
	Type      string              `json:"type"`
	Timestamp int64               `json:"timestamp"`
	Payload   StartCommandPayload `json:"payload"`
}

func main() {
	_ = godotenv.Load()

	// 1. Setup RabbitMQ
	rabbit := rabbitmq.NewRabbitMQService()
	if err := rabbit.Connect(); err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	log.Println("Connected to RabbitMQ")

	// 2. Setup WhatsApp Service (Postgres Store)
	waService := whatsapp.NewWhatsAppService(rabbit)

	// 3. Auto-restart sessions after a small delay
	go func() {
		time.Sleep(5 * time.Second)
		log.Println("🔄 Auto-restarting existing sessions...")
		waService.AutoRestartSessions()
	}()

	// 4. Listen for Commands
	routingKeys := []string{
		"wbot.*.*.session.start",
		"wbot.*.*.session.stop",
	}

	err := rabbit.ConsumeCommands("engine.go.commands", routingKeys, func(d amqp.Delivery) {
		log.Printf("Received command: %s", d.RoutingKey)
		
		parts := strings.Split(d.RoutingKey, ".")
		if len(parts) < 4 {
			log.Printf("Invalid routing key: %s", d.RoutingKey)
			d.Ack(false)
			return
		}

		tenantID := parts[1]
		sessionID, _ := strconv.Atoi(parts[2])
		commandType := strings.Join(parts[3:], ".")

		switch commandType {
		case "session.start":
			var envelope CommandEnvelope
			if err := json.Unmarshal(d.Body, &envelope); err != nil {
				// Fallback for direct payload if envelope is missing
				var payload StartCommandPayload
				if errJson := json.Unmarshal(d.Body, &payload); errJson == nil {
					// Use current time as fallback timestamp
					ts := time.Now().Unix()
					_ = waService.StartClient(sessionID, tenantID, payload.Name, ts, payload.ProxyURL, payload.UsePairingCode, payload.PhoneNumber)
				} else {
					log.Printf("Invalid command payload for session.start (%d): %v", sessionID, err)
				}
			} else {
				payload := envelope.Payload
				ts := envelope.Timestamp
				if ts == 0 {
					ts = time.Now().Unix()
				}
				err := waService.StartClient(sessionID, tenantID, payload.Name, ts, payload.ProxyURL, payload.UsePairingCode, payload.PhoneNumber)
				if err != nil {
					log.Printf("Error starting client %d: %v", sessionID, err)
				}
			}
		case "session.stop":
			err := waService.StopClient(sessionID)
			if err != nil {
				log.Printf("Error stopping client %d: %v", sessionID, err)
			}
		}

		d.Ack(false)
	})

	if err != nil {
		log.Fatalf("Failed to start command consumer: %v", err)
	}

	log.Println("Watink Engine Go (WhatsMeow) started with PostgreSQL Store")

	// Wait for termination
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("Shutting down...")
}
