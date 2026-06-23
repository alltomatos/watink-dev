package rabbitmq

import "github.com/streadway/amqp"

// MessageBroker abstracts the AMQP operations used by engine-go,
// allowing offline unit tests through a mock implementation.
type MessageBroker interface {
	Connect() error
	ConsumeCommands(queueName string, routingKeys []string, handler func(amqp.Delivery)) error
	PublishEvent(routingKey string, payload interface{}) error
	Close() error
}

// compile-time assertion: RabbitMQService must satisfy MessageBroker.
var _ MessageBroker = (*RabbitMQService)(nil)
