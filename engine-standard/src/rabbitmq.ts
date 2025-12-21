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

  async connect(): Promise<void> {
    try {
      this.connection = await client.connect(this.url) as any;
      this.channel = await this.connection!.createChannel();
      logger.info("Connected to RabbitMQ");

      await this.setupExchanges();
    } catch (error) {
      logger.error("Failed to connect to RabbitMQ", error);
      // Retry logic could go here
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async setupExchanges(): Promise<void> {
    if (!this.channel) return;

    // Command Exchange (Backend -> Engine)
    await this.channel.assertExchange("wbot.commands", "direct", { durable: true });

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
    if (!this.channel) return;

    // Create a temporary queue for this engine instance
    // In a real scenario with sticky sessions, we might want a specific queue name
    // For now, we bind to 'command.general' and potentially specific session IDs if we implement sticky logic later
    const q = await this.channel.assertQueue("", { exclusive: true });

    await this.channel.bindQueue(q.queue, "wbot.commands", "command.general");
    
    // We could also bind to specific session IDs here dynamically as we start sessions
    await this.channel.bindQueue(q.queue, "wbot.commands", "wbot.*.*.session.start");
    await this.channel.bindQueue(q.queue, "wbot.commands", "wbot.*.*.message.send.text");
    await this.channel.bindQueue(q.queue, "wbot.commands", "wbot.*.*.message.send.media");

    this.channel.consume(q.queue, async (msg: ConsumeMessage | null) => {
      if (msg) {
        try {
          const content: Envelope = JSON.parse(msg.content.toString());
          await handler(content);
          this.channel?.ack(msg);
        } catch (error) {
          logger.error("Error processing message", error);
          this.channel?.nack(msg, false, false); // Don't requeue for now to avoid loop
        }
      }
    });
  }
}
