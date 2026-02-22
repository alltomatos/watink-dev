"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const logger_1 = require("../../utils/logger");
const FlowSession_1 = __importDefault(require("../../models/FlowSession"));
const FlowTriggerService_1 = __importDefault(require("./FlowTriggerService"));
const FlowExecutorService_1 = __importDefault(require("./FlowExecutorService"));
class FlowWorkerService {
    async start() {
        logger_1.logger.info("Starting FlowWorkerService...");
        // Routing keys we want to consume
        const routingKeys = ["flow.execution.*"];
        // We consume from a DEDICATED queue for flow processing
        // RabbitMQService.consumeEvents usually binds to 'api.events.process'.
        // We want to consume commands/events related to flows.
        // Let's use consumeCommands but potentially with a different queue name if the lib allows, 
        // or just share the command queue but filter by routing key (less ideal for scalability but works for now).
        // Better: RabbitMQService.consumeEvents allows passing a callback.
        await RabbitMQService_1.default.consumeCommands("flow.worker.queue", routingKeys, async (msg) => {
            await this.processMessage(msg);
        });
        logger_1.logger.info("FlowWorkerService started and listening on flow.execution.*");
    }
    async processMessage(msg) {
        const { type, payload, tenantId } = msg;
        const data = payload;
        logger_1.logger.info(`FlowWorker processing: ${type} for ticket ${data.ticketId}`);
        try {
            if (type === "whatsapp_message") {
                await this.handleWhatsAppMessage(data, tenantId);
            }
            // Add other event types here (e.g., kanban_card_moved)
        }
        catch (err) {
            logger_1.logger.error(`Error processing flow message ${msg.id}: ${err}`);
            // TODO: Implement DLQ or Retry logic
        }
    }
    async handleWhatsAppMessage(data, tenantId) {
        const { ticketId, contactId, messageBody, fromMe } = data;
        if (fromMe)
            return; // Ignore own messages
        // 1. Check for Active Session
        const activeSession = await FlowSession_1.default.findOne({
            where: {
                entityId: ticketId,
                entityType: "ticket",
                status: "active"
            }
        });
        if (activeSession) {
            logger_1.logger.info(`[FlowWorker] Found active session ${activeSession.id} for ticket ${ticketId}`);
            await FlowExecutorService_1.default.next(activeSession.id, messageBody);
        }
        else {
            // 2. Check for Triggers
            const trigger = await FlowTriggerService_1.default.findTrigger("whatsapp_message", { body: messageBody }, tenantId);
            if (trigger) {
                logger_1.logger.info(`[FlowWorker] Trigger matched! Starting Flow ${trigger.flowId}`);
                await FlowExecutorService_1.default.start(trigger.flowId, {
                    ticketId,
                    contactId,
                    messageBody
                });
            }
        }
    }
}
exports.default = new FlowWorkerService();
