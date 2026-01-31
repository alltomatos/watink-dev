import * as client from "amqplib";
import { Channel, ConsumeMessage } from "amqplib";
import { Envelope } from "./contracts";
import { logger } from "./logger";
import { config } from "./config";

export class RabbitMQ {
  private connection: any = null;
  private channel: Channel | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  private handler: ((msg: Envelope) => Promise<void>) | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await client.connect(this.url) as any;
      this.channel = await this.connection!.createChannel();
      logger.info("Connected to RabbitMQ");

      await this.setupExchanges();
      if (this.handler) {
        await this.setupConsumer();
      }
    } catch (error) {
      logger.error(error, "Failed to connect to RabbitMQ");
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async setupExchanges(): Promise<void> {
    if (!this.channel) return;

    // Command Exchange (Backend -> Engine)
    await this.channel.assertExchange("wbot.commands", "topic", { durable: true });

    // Event Exchange (Engine -> Backend)
    await this.channel.assertExchange("wbot.events", "topic", { durable: true });
  }

  async publishEvent(routingKey: string, message: Envelope): Promise<void> {
    if (!this.channel) {
      logger.warn("Cannot publish event, channel is closed");
      return;
    }

    logger.info(`[RabbitMQ] Publishing event to ${routingKey}: ${message.type}`);

    this.channel.publish(
      "wbot.events",
      routingKey,
      Buffer.from(JSON.stringify(message))
    );
  }

  async consumeCommands(handler: (msg: Envelope) => Promise<void>): Promise<void> {
    this.handler = handler;
    if (this.channel) {
      await this.setupConsumer();
    }
  }

  private async setupConsumer(): Promise<void> {
    if (!this.channel || !this.handler) return;

    // Create a durable queue for this engine instance
    const q = await this.channel.assertQueue("wbot_papi_commands", { durable: true });

    // Bind only papi commands
    // Pattern: wbot.<tenantId>.<sessionId>.<engineType>.<commandType>
    await this.channel.bindQueue(q.queue, "wbot.commands", "wbot.*.*.papi.#");

    this.channel.consume(q.queue, async (msg: ConsumeMessage | null) => {
      if (msg) {
        try {
          logger.info(`[RabbitMQ] Engine Received command on ${msg.fields.routingKey}`);
          const content: Envelope = JSON.parse(msg.content.toString());
          if (this.handler) {
            await this.handler(content);
          }
          this.channel?.ack(msg);
        } catch (error) {
          logger.error(error, "Error processing message");
          this.channel?.nack(msg, false, false);
        }
      }
    });

    logger.info("Consumer setup completed, listening for PAPI commands.");
  }
}

export const rabbitmq = new RabbitMQ(config.rabbitmq.url);
