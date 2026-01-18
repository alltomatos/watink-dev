import * as client from "amqplib";
import { Channel, ConsumeMessage } from "amqplib";
import { Envelope } from "./contracts";
import { logger } from "./logger";

export class RabbitMQ {
    private connection: any = null;
    private channel: Channel | null = null;
    private url: string;
    private handler: ((msg: Envelope) => Promise<void>) | null = null;

    constructor(url: string) {
        this.url = url;
    }

    async connect(): Promise<void> {
        try {
            this.connection = await client.connect(this.url);
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

        // Exchanges específicos para webchat
        await this.channel.assertExchange("webchat.commands", "topic", { durable: true });
        await this.channel.assertExchange("webchat.events", "topic", { durable: true });

        logger.info("Exchanges setup completed");
    }

    async publishEvent(routingKey: string, message: Envelope): Promise<void> {
        if (!this.channel) {
            logger.warn("Cannot publish event, channel is closed");
            return;
        }

        logger.info(`Publishing event to ${routingKey}: ${message.type}`);

        this.channel.publish(
            "webchat.events",
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

        // Fila durável para comandos do webchat
        const q = await this.channel.assertQueue("webchat_worker_commands", { durable: true });

        // Escuta todos os comandos do webchat
        await this.channel.bindQueue(q.queue, "webchat.commands", "webchat.#");

        this.channel.consume(q.queue, async (msg: ConsumeMessage | null) => {
            if (msg) {
                try {
                    logger.info(`Received command on ${msg.fields.routingKey}`);
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

        logger.info("Consumer setup completed, listening for webchat commands.");
    }
}
