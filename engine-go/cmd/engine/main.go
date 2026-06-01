package main

import (
	"encoding/json"
	"fmt"
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
	Type      string          `json:"type"`
	Timestamp int64           `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

func main() {
	_ = godotenv.Load()

	rabbit := rabbitmq.NewRabbitMQService()
	if err := rabbit.Connect(); err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	log.Println("Connected to RabbitMQ")

	waService := whatsapp.NewWhatsAppService(rabbit)

	go func() {
		time.Sleep(5 * time.Second)
		log.Println("Auto-restarting existing sessions...")
		waService.AutoRestartSessions()
	}()

	routingKeys := []string{
		"wbot.*.*.session.start",
		"wbot.*.*.session.stop",
		"wbot.*.*.session.delete",
		"wbot.*.*.message.send.text",
		"wbot.*.*.message.send.media",
		"wbot.*.*.message.markAsRead",
		"wbot.*.*.contact.sync",
		"wbot.*.*.contact.import",
		"wbot.*.*.history.sync",
	}

	err := rabbit.ConsumeCommands("engine.go.commands", routingKeys, func(d amqp.Delivery) {
		if err := handleCommand(d, waService); err != nil {
			log.Printf("Command failed %s: %v", d.RoutingKey, err)
		}
		d.Ack(false)
	})
	if err != nil {
		log.Fatalf("Failed to start command consumer: %v", err)
	}

	log.Println("Watink Engine Go (WhatsMeow) started with PostgreSQL Store")

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("Shutting down...")
}

func commandTypeFromRoutingKey(d amqp.Delivery) (string, error) {
	parts := strings.Split(d.RoutingKey, ".")
	if len(parts) < 4 {
		return "", fmt.Errorf("invalid routing key: %s", d.RoutingKey)
	}

	commandType := strings.Join(parts[3:], ".")
	switch commandType {
	case "session.start", "session.stop", "session.delete", "message.send.text", "message.send.media", "message.markAsRead", "contact.sync", "contact.import", "history.sync":
		return commandType, nil
	default:
		return "", fmt.Errorf("unknown command type: %s", commandType)
	}
}

func handleCommand(d amqp.Delivery, waService *whatsapp.WhatsAppService) error {
	log.Printf("Received command: %s", d.RoutingKey)
	parts := strings.Split(d.RoutingKey, ".")
	if len(parts) < 4 {
		log.Printf("Invalid routing key: %s", d.RoutingKey)
		return nil
	}

	tenantID := parts[1]
	sessionID, err := strconv.Atoi(parts[2])
	if err != nil {
		log.Printf("Invalid session ID in routing key %s: %v", d.RoutingKey, err)
		return nil
	}
	commandType, err := commandTypeFromRoutingKey(d)
	if err != nil {
		log.Printf("Failed to parse command type from %s: %v", d.RoutingKey, err)
		return nil
	}

	var envelope CommandEnvelope
	if err := json.Unmarshal(d.Body, &envelope); err != nil {
		return err
	}

	switch commandType {
	case "session.start":
		var payload StartCommandPayload
		if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
			return err
		}
		ts := envelope.Timestamp
		if ts == 0 {
			ts = time.Now().UnixMilli()
		}
		return waService.StartClient(sessionID, tenantID, payload.Name, ts, payload.ProxyURL, payload.UsePairingCode, payload.PhoneNumber)
	case "session.stop":
		return waService.StopClient(sessionID)
	case "session.delete":
		if err := waService.StopClient(sessionID); err != nil {
			log.Printf("Stop client warning for %d: %v", sessionID, err)
		}
		return waService.ForceLogout(sessionID)
	case "message.send.text":
		var payload whatsapp.TextCommandPayload
		if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
			return err
		}
		return waService.SendText(sessionID, tenantID, payload)
	case "message.send.media":
		var payload whatsapp.MediaCommandPayload
		if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
			return err
		}
		return waService.SendMedia(sessionID, tenantID, payload)
	case "message.markAsRead":
		var payload whatsapp.MarkReadCommandPayload
		if err := json.Unmarshal(envelope.Payload, &payload); err != nil {
			return err
		}
		return waService.MarkRead(sessionID, payload)
	case "contact.sync", "contact.import", "history.sync":
		log.Printf("Command %s received but not implemented in engine-go", commandType)
		return nil
	default:
		log.Printf("Unknown command type: %s", commandType)
		return nil
	}
}
