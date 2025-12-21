package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Client struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	url     string
}

type Envelope struct {
	ID        string      `json:"id"`
	Timestamp int64       `json:"timestamp"`
	TenantID  interface{} `json:"tenantId"` // string or number
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload"`
}

func NewClient(url string) *Client {
	return &Client{url: url}
}

func (c *Client) Connect() error {
	var err error
	c.conn, err = amqp.Dial(c.url)
	if err != nil {
		return fmt.Errorf("failed to connect to rabbitmq: %w", err)
	}

	c.channel, err = c.conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to open channel: %w", err)
	}

	log.Println("Connected to RabbitMQ")
	return c.setupExchanges()
}

func (c *Client) setupExchanges() error {
	err := c.channel.ExchangeDeclare(
		"wbot.commands", // name
		"direct",        // type
		true,            // durable
		false,           // auto-deleted
		false,           // internal
		false,           // no-wait
		nil,             // arguments
	)
	if err != nil {
		return err
	}

	return c.channel.ExchangeDeclare(
		"wbot.events", // name
		"topic",       // type
		true,          // durable
		false,         // auto-deleted
		false,         // internal
		false,         // no-wait
		nil,           // arguments
	)
}

func (c *Client) PublishEvent(routingKey string, message Envelope) error {
	body, err := json.Marshal(message)
	if err != nil {
		return err
	}

	return c.channel.PublishWithContext(
		context.Background(),
		"wbot.events",
		routingKey,
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
}

func (c *Client) ConsumeCommands(handler func(Envelope) error) error {
	q, err := c.channel.QueueDeclare(
		"",    // name
		false, // durable
		false, // delete when unused
		true,  // exclusive
		false, // no-wait
		nil,   // arguments
	)
	if err != nil {
		return err
	}

	err = c.channel.QueueBind(
		q.Name,
		"command.general",
		"wbot.commands",
		false,
		nil,
	)
	if err != nil {
		return err
	}

	msgs, err := c.channel.Consume(
		q.Name,
		"",    // consumer
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)
	if err != nil {
		return err
	}

	go func() {
		for d := range msgs {
			var env Envelope
			if err := json.Unmarshal(d.Body, &env); err != nil {
				log.Printf("Error decoding message: %v", err)
				d.Nack(false, false)
				continue
			}

			if err := handler(env); err != nil {
				log.Printf("Error handling message: %v", err)
				d.Nack(false, false) // or true for requeue
			} else {
				d.Ack(false)
			}
		}
	}()

	return nil
}

func (c *Client) Close() {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		c.conn.Close()
	}
}
