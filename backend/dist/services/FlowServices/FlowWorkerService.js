"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info("Starting FlowWorkerService...");
            // Routing keys we want to consume
            const routingKeys = ["flow.execution.*"];
            // We consume from a DEDICATED queue for flow processing
            // RabbitMQService.consumeEvents usually binds to 'api.events.process'.
            // We want to consume commands/events related to flows.
            // Let's use consumeCommands but potentially with a different queue name if the lib allows, 
            // or just share the command queue but filter by routing key (less ideal for scalability but works for now).
            // Better: RabbitMQService.consumeEvents allows passing a callback.
            yield RabbitMQService_1.default.consumeCommands("flow.worker.queue", routingKeys, (msg) => __awaiter(this, void 0, void 0, function* () {
                yield this.processMessage(msg);
            }));
            logger_1.logger.info("FlowWorkerService started and listening on flow.execution.*");
        });
    }
    processMessage(msg) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type, payload, tenantId } = msg;
            const data = payload;
            logger_1.logger.info(`FlowWorker processing: ${type} for ticket ${data.ticketId}`);
            try {
                if (type === "whatsapp_message") {
                    yield this.handleWhatsAppMessage(data, tenantId);
                }
                // Add other event types here (e.g., kanban_card_moved)
            }
            catch (err) {
                logger_1.logger.error(`Error processing flow message ${msg.id}: ${err}`);
                // TODO: Implement DLQ or Retry logic
            }
        });
    }
    handleWhatsAppMessage(data, tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { ticketId, contactId, messageBody, fromMe } = data;
            if (fromMe)
                return; // Ignore own messages
            // 1. Check for Active Session
            const activeSession = yield FlowSession_1.default.findOne({
                where: {
                    entityId: ticketId,
                    entityType: "ticket",
                    status: "active"
                }
            });
            if (activeSession) {
                logger_1.logger.info(`[FlowWorker] Found active session ${activeSession.id} for ticket ${ticketId}`);
                yield FlowExecutorService_1.default.next(activeSession.id, messageBody);
            }
            else {
                // 2. Check for Triggers
                const trigger = yield FlowTriggerService_1.default.findTrigger("whatsapp_message", { body: messageBody }, tenantId);
                if (trigger) {
                    logger_1.logger.info(`[FlowWorker] Trigger matched! Starting Flow ${trigger.flowId}`);
                    yield FlowExecutorService_1.default.start(trigger.flowId, {
                        ticketId,
                        contactId,
                        messageBody
                    });
                }
            }
        });
    }
}
exports.default = new FlowWorkerService();
