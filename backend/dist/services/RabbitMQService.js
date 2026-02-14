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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client = __importStar(require("amqplib"));
const logger_1 = require("../utils/logger");
const context_1 = __importDefault(require("../libs/context"));
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
    isValidEnvelope(raw) {
        return !!raw
            && typeof raw === "object"
            && typeof raw.id === "string"
            && typeof raw.type === "string"
            && typeof raw.timestamp === "number"
            && (typeof raw.tenantId === "string" || typeof raw.tenantId === "number")
            && Object.prototype.hasOwnProperty.call(raw, "payload");
    }
    validateEnvelopeOrThrow(raw) {
        if (!this.isValidEnvelope(raw)) {
            throw new Error("Invalid AMQP envelope contract");
        }
        return raw;
    }
    async setupExchanges() {
        if (!this.channel)
            return;
        await this.channel.assertExchange("wbot.commands", "topic", { durable: true });
        await this.channel.assertExchange("wbot.events", "topic", { durable: true });
        // Setup Engine Queues (Legacy shared queues for backward compatibility during transition)
        // In "Total Isolation" mode, these would be per-tenant, but for now we fix the bindings
        const standardQueue = await this.channel.assertQueue("wbot_standard_commands", { durable: true });
        await this.channel.bindQueue(standardQueue.queue, "wbot.commands", "wbot.tenant.*.whaileys.#");
        const goQueue = await this.channel.assertQueue("wbot_go_commands", { durable: true });
        await this.channel.bindQueue(goQueue.queue, "wbot.commands", "wbot.tenant.*.whatsmeow.#");
        // PAPI Engine
        const papiQueue = await this.channel.assertQueue("wbot_papi_commands", { durable: true });
        await this.channel.bindQueue(papiQueue.queue, "wbot.commands", "wbot.tenant.*.papi.#");
    }
    /**
     * Generates a restrictive routing key following the multi-tenancy contract.
     * Format: wbot.tenant.{tenantId}.{engine}.{sessionId}.{type}
     */
    generateRoutingKey(tenantId, engine, sessionId, type) {
        if (!tenantId)
            throw new Error("tenantId is mandatory for routing keys");
        return `wbot.tenant.${tenantId}.${engine}.${sessionId}.${type}`;
    }
    async publishCommand(routingKey, message, exchange = "wbot.commands") {
        if (!this.channel) {
            logger_1.logger.warn("Cannot publish command, channel is closed");
            return false;
        }
        logger_1.logger.info(`[RabbitMQ] Publishing command to ${routingKey} on exchange ${exchange}`);
        return this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
    }
    async publishEvent(routingKey, message) {
        if (!this.channel) {
            logger_1.logger.warn("Cannot publish event, channel is closed");
            return;
        }
        logger_1.logger.info(`[RabbitMQ] Publishing event to ${routingKey}`);
        this.channel.publish("wbot.events", routingKey, Buffer.from(JSON.stringify(message)));
    }
    async consumeEvents(queueName, routingKeys, handler, authorizedTenantId) {
        if (!this.channel)
            return;
        const q = await this.channel.assertQueue(queueName, { durable: true });
        for (const key of routingKeys) {
            await this.channel.bindQueue(q.queue, "wbot.events", key);
        }
        this.channel.consume(q.queue, async (msg) => {
            if (msg) {
                try {
                    const raw = JSON.parse(msg.content.toString());
                    const content = this.validateEnvelopeOrThrow(raw);
                    // Security Check: Total Isolation
                    if (authorizedTenantId && String(content.tenantId) !== String(authorizedTenantId)) {
                        logger_1.logger.error(`[Security] Worker authorized for tenant ${authorizedTenantId} received message for tenant ${content.tenantId}. Ignoring.`);
                        this.channel?.ack(msg);
                        return;
                    }
                    // Fix Context Propagation
                    await context_1.default.run({ tenantId: String(content.tenantId) }, async () => {
                        await handler(content);
                    });
                    this.channel?.ack(msg);
                }
                catch (error) {
                    logger_1.logger.error(`Error processing event: ${error.message}\n${error.stack}`);
                    this.channel?.nack(msg, false, false);
                }
            }
        });
    }
    async consumeCommands(queueName, routingKeys, handler, authorizedTenantId) {
        if (!this.channel)
            return;
        const q = await this.channel.assertQueue(queueName, { durable: true });
        for (const key of routingKeys) {
            await this.channel.bindQueue(q.queue, "wbot.commands", key);
        }
        this.channel.consume(q.queue, async (msg) => {
            if (msg) {
                try {
                    const raw = JSON.parse(msg.content.toString());
                    const content = this.validateEnvelopeOrThrow(raw);
                    // Security Check: Total Isolation
                    if (authorizedTenantId && String(content.tenantId) !== String(authorizedTenantId)) {
                        logger_1.logger.error(`[Security] Command worker authorized for tenant ${authorizedTenantId} received message for tenant ${content.tenantId}. Ignoring.`);
                        this.channel?.ack(msg);
                        return;
                    }
                    // Fix Context Propagation
                    await context_1.default.run({ tenantId: String(content.tenantId) }, async () => {
                        await handler(content);
                    });
                    this.channel?.ack(msg);
                }
                catch (error) {
                    logger_1.logger.error("Error processing command", error);
                    this.channel?.nack(msg, false, false);
                }
            }
        });
    }
    async consumeQueue(queueName, handler) {
        if (!this.channel)
            return;
        await this.channel.assertQueue(queueName, { durable: true });
        this.channel.consume(queueName, async (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    await handler(content);
                    this.channel?.ack(msg);
                }
                catch (error) {
                    logger_1.logger.error(`Error processing queue message: ${error.message}`);
                    this.channel?.nack(msg, false, false);
                }
            }
        });
    }
}
exports.default = new RabbitMQService();
