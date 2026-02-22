"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client = __importStar(require("amqplib"));
const logger_1 = require("../utils/logger");
class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.url = process.env.AMQP_URL || "amqp://guest:guest@localhost:5672";
    }
    async connect() {
        try {
            this.connection = await client.connect(this.url);
            this.connection.on("error", (err) => {
                logger_1.logger.error("RabbitMQ Connection Error", err);
                setTimeout(() => this.connect(), 5000);
            });
            this.connection.on("close", () => {
                logger_1.logger.warn("RabbitMQ Connection Closed");
                setTimeout(() => this.connect(), 5000);
            });
            this.channel = await this.connection.createChannel();
            logger_1.logger.info("Connected to RabbitMQ");
            await this.setupExchanges();
        }
        catch (error) {
            logger_1.logger.error("Failed to connect to RabbitMQ", error);
            setTimeout(() => this.connect(), 5000);
        }
    }
    async setupExchanges() {
        if (!this.channel)
            return;
        await this.channel.assertExchange("wbot.commands", "topic", { durable: true });
        await this.channel.assertExchange("wbot.events", "topic", { durable: true });
    }
    async publishCommand(routingKey, message) {
        if (!this.channel) {
            logger_1.logger.warn("Cannot publish command, channel is closed");
            return;
        }
        logger_1.logger.info(`[RabbitMQ] Publishing command to ${routingKey}`);
        this.channel.publish("wbot.commands", routingKey, Buffer.from(JSON.stringify(message)));
    }
    async publishEvent(routingKey, message) {
        if (!this.channel) {
            logger_1.logger.warn("Cannot publish event, channel is closed");
            return;
        }
        logger_1.logger.info(`[RabbitMQ] Publishing event to ${routingKey}`);
        this.channel.publish("wbot.events", routingKey, Buffer.from(JSON.stringify(message)));
    }
    async consumeEvents(queueName, routingKeys, handler) {
        if (!this.channel)
            return;
        const q = await this.channel.assertQueue(queueName, { durable: true });
        for (const key of routingKeys) {
            await this.channel.bindQueue(q.queue, "wbot.events", key);
        }
        this.channel.consume(q.queue, async (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    await handler(content);
                    this.channel?.ack(msg);
                }
                catch (error) {
                    logger_1.logger.error(`Error processing event: ${error.message}\n${error.stack}`);
                    this.channel?.nack(msg, false, false);
                }
            }
        });
    }
    async consumeCommands(queueName, routingKeys, handler) {
        if (!this.channel)
            return;
        const q = await this.channel.assertQueue(queueName, { durable: true });
        for (const key of routingKeys) {
            await this.channel.bindQueue(q.queue, "wbot.commands", key);
        }
        this.channel.consume(q.queue, async (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    await handler(content);
                    this.channel?.ack(msg);
                }
                catch (error) {
                    logger_1.logger.error("Error processing command", error);
                    this.channel?.nack(msg, false, false);
                }
            }
        });
    }
}
exports.default = new RabbitMQService();
