package services

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/streadway/amqp"
)

type RabbitMQService struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	url     string
}

func NewRabbitMQService() *RabbitMQService {
	url := os.Getenv("AMQP_URL")
	if url == "" {
		url = "amqp://***REMOVED_AMQP_CREDENTIALS***@localhost:5672"
	}
	return &RabbitMQService{
		url: url,
	}
}

func (s *RabbitMQService) Connect() error {
	var err error
	s.conn, err = amqp.Dial(s.url)
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %v", err)
	}

	go func() {
		<-s.conn.NotifyClose(make(chan *amqp.Error))
		log.Println("RabbitMQ connection closed. Reconnecting...")
		time.Sleep(5 * time.Second)
		s.Connect()
	}()

	s.channel, err = s.conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to open a channel: %v", err)
	}

	err = s.setupExchanges()
	if err != nil {
		return fmt.Errorf("failed to setup exchanges: %v", err)
	}

	log.Println("Connected to RabbitMQ successfully")
	return nil
}

func (s *RabbitMQService) setupExchanges() error {
	err := s.channel.ExchangeDeclare(
		"wbot.commands", // name
		"topic",         // type
		true,            // durable
		false,           // auto-deleted
		false,           // internal
		false,           // no-wait
		nil,             // arguments
	)
	if err != nil {
		return err
	}

	return s.channel.ExchangeDeclare(
		"wbot.events", // name
		"topic",       // type
		true,          // durable
		false,         // auto-deleted
		false,         // internal
		false,         // no-wait
		nil,           // arguments
	)
}

func (s *RabbitMQService) PublishCommand(routingKey string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	log.Printf("[RabbitMQ] Publishing command to %s", routingKey)
	return s.channel.Publish(
		"wbot.commands", // exchange
		routingKey,      // routing key
		false,           // mandatory
		false,           // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
}

func (s *RabbitMQService) PublishEvent(routingKey string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	log.Printf("[RabbitMQ] Publishing event to %s", routingKey)
	return s.channel.Publish(
		"wbot.events", // exchange
		routingKey,    // routing key
		false,         // mandatory
		false,         // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
}

func (s *RabbitMQService) ConsumeEvents(queueName string, routingKeys []string, handler func(amqp.Delivery)) error {
	_, err := s.channel.QueueDeclare(
		queueName, // name
		true,      // durable
		false,     // delete when unused
		false,     // exclusive
		false,     // no-wait
		nil,       // arguments
	)
	if err != nil {
		return err
	}

	for _, key := range routingKeys {
		err = s.channel.QueueBind(
			queueName,     // queue name
			key,           // routing key
			"wbot.events", // exchange
			false,
			nil,
		)
		if err != nil {
			return err
		}
	}

	msgs, err := s.channel.Consume(
		queueName, // queue
		"",        // consumer
		false,     // auto-ack
		false,     // exclusive
		false,     // no-local
		false,     // no-wait
		nil,       // args
	)
	if err != nil {
		return err
	}

	go func() {
		for d := range msgs {
			handler(d)
		}
	}()

	return nil
}
