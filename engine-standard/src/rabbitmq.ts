import * as client from "amqplib";
import { Connection, Channel, ConsumeMessage } from "amqplib";
import { Envelope } from "./contracts";
import { logger } from "./logger";

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
      logger.error("Failed to connect to RabbitMQ", error);
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

    // Create a temporary queue for this engine instance
    const q = await this.channel.assertQueue("", { exclusive: true });

    await this.channel.bindQueue(q.queue, "wbot.commands", "command.general");
    await this.channel.bindQueue(q.queue, "wbot.commands", "wbot.*.*.session.start");
    await this.channel.bindQueue(q.queue, "wbot.commands", "wbot.*.*.message.send.text");
    await this.channel.bindQueue(q.queue, "wbot.commands", "wbot.*.*.message.send.media");

    this.channel.consume(q.queue, async (msg: ConsumeMessage | null) => {
      if (msg) {
        try {
          const content: Envelope = JSON.parse(msg.content.toString());
          if (this.handler) {
            await this.handler(content);
          }
          this.channel?.ack(msg);
        } catch (error) {
          logger.error("Error processing message", error);
          this.channel?.nack(msg, false, false);
        }
      }
    });

    logger.info("Consumer setup completed, listening for commands.");
  }
}
