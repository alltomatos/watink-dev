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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client = __importStar(require("amqplib"));
const logger_1 = require("../utils/logger");
class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.url = process.env.AMQP_URL || "amqp://***REMOVED_AMQP_CREDENTIALS***@localhost:5672";
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.connection = (yield client.connect(this.url));
                this.connection.on("error", (err) => {
                    logger_1.logger.error("RabbitMQ Connection Error", err);
                    setTimeout(() => this.connect(), 5000);
                });
                this.connection.on("close", () => {
                    logger_1.logger.warn("RabbitMQ Connection Closed");
                    setTimeout(() => this.connect(), 5000);
                });
                this.channel = yield this.connection.createChannel();
                logger_1.logger.info("Connected to RabbitMQ");
                yield this.setupExchanges();
            }
            catch (error) {
                logger_1.logger.error("Failed to connect to RabbitMQ", error);
                setTimeout(() => this.connect(), 5000);
            }
        });
    }
    setupExchanges() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.channel)
                return;
            yield this.channel.assertExchange("wbot.commands", "topic", { durable: true });
            yield this.channel.assertExchange("wbot.events", "topic", { durable: true });
        });
    }
    publishCommand(routingKey, message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.channel) {
                logger_1.logger.warn("Cannot publish command, channel is closed");
                return;
            }
            logger_1.logger.info(`[RabbitMQ] Publishing command to ${routingKey}`);
            this.channel.publish("wbot.commands", routingKey, Buffer.from(JSON.stringify(message)));
        });
    }
    consumeEvents(queueName, routingKeys, handler) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.channel)
                return;
            const q = yield this.channel.assertQueue(queueName, { durable: true });
            for (const key of routingKeys) {
                yield this.channel.bindQueue(q.queue, "wbot.events", key);
            }
            this.channel.consume(q.queue, (msg) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        yield handler(content);
                        (_a = this.channel) === null || _a === void 0 ? void 0 : _a.ack(msg);
                    }
                    catch (error) {
                        logger_1.logger.error(`Error processing event: ${error.message}\n${error.stack}`);
                        (_b = this.channel) === null || _b === void 0 ? void 0 : _b.nack(msg, false, false);
                    }
                }
            }));
        });
    }
    consumeCommands(queueName, routingKeys, handler) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.channel)
                return;
            const q = yield this.channel.assertQueue(queueName, { durable: true });
            for (const key of routingKeys) {
                yield this.channel.bindQueue(q.queue, "wbot.commands", key);
            }
            this.channel.consume(q.queue, (msg) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                if (msg) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        yield handler(content);
                        (_a = this.channel) === null || _a === void 0 ? void 0 : _a.ack(msg);
                    }
                    catch (error) {
                        logger_1.logger.error("Error processing command", error);
                        (_b = this.channel) === null || _b === void 0 ? void 0 : _b.nack(msg, false, false);
                    }
                }
            }));
        });
    }
}
exports.default = new RabbitMQService();
