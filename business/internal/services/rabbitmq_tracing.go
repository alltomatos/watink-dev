package services

import (
	amqp "github.com/streadway/amqp"
)

// amqpHeaderCarrier implements propagation.TextMapCarrier for AMQP headers.
type amqpHeaderCarrier struct {
	headers amqp.Table
}

func (c *amqpHeaderCarrier) Get(key string) string {
	if c.headers == nil {
		return ""
	}
	v, ok := c.headers[key]
	if !ok {
		return ""
	}
	s, ok := v.(string)
	if !ok {
		return ""
	}
	return s
}

func (c *amqpHeaderCarrier) Set(key, value string) {
	if c.headers == nil {
		c.headers = amqp.Table{}
	}
	c.headers[key] = value
}

func (c *amqpHeaderCarrier) Keys() []string {
	keys := make([]string, 0, len(c.headers))
	for k := range c.headers {
		keys = append(keys, k)
	}
	return keys
}
