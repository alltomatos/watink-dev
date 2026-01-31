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
const CheckContactOpenTickets_1 = __importDefault(require("../../helpers/CheckContactOpenTickets"));
const SetTicketMessagesAsRead_1 = __importDefault(require("../../helpers/SetTicketMessagesAsRead"));
const socket_1 = require("../../libs/socket");
const Contact_1 = __importDefault(require("../../models/Contact"));
const Step_1 = __importDefault(require("../../models/Step"));
const Setting_1 = __importDefault(require("../../models/Setting"));
const ShowTicketService_1 = __importDefault(require("./ShowTicketService"));
const EmbeddingService_1 = __importDefault(require("../AIServices/EmbeddingService"));
const EntityTagService_1 = __importDefault(require("../TagServices/EntityTagService"));
const logger_1 = require("../../utils/logger");
const UpdateTicketService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ ticketData, ticketId }) {
    var _b, _c;
    const { status, userId, queueId, whatsappId, stepId } = ticketData;
    const ticket = yield (0, ShowTicketService_1.default)(ticketId);
    yield (0, SetTicketMessagesAsRead_1.default)(ticket);
    if (whatsappId && ticket.whatsappId !== whatsappId) {
        yield (0, CheckContactOpenTickets_1.default)(ticket.contactId, whatsappId);
    }
    const oldStatus = ticket.status;
    const oldUserId = (_b = ticket.user) === null || _b === void 0 ? void 0 : _b.id;
    const oldStepId = ticket.stepId;
    if (oldStatus === "closed") {
        yield (0, CheckContactOpenTickets_1.default)(ticket.contact.id, ticket.whatsappId);
    }
    // Build update object
    const updateData = {};
    if (status !== undefined)
        updateData.status = status;
    if (queueId !== undefined)
        updateData.queueId = queueId;
    if (userId !== undefined)
        updateData.userId = userId;
    if (stepId !== undefined)
        updateData.stepId = stepId;
    yield ticket.update(updateData);
    if (ticketData.tags) {
        yield EntityTagService_1.default.SyncEntityTags({
            tagIds: ticketData.tags,
            entityType: "ticket",
            entityId: ticket.id,
            tenantId: ticket.tenantId
        });
    }
    if (whatsappId) {
        yield ticket.update({
            whatsappId
        });
    }
    const ticketUpdated = yield (0, ShowTicketService_1.default)(ticket.id);
    const io = (0, socket_1.getIO)();
    if (ticket.status !== oldStatus || ((_c = ticket.user) === null || _c === void 0 ? void 0 : _c.id) !== oldUserId) {
        io.to(oldStatus).emit("ticket", {
            action: "delete",
            ticketId: ticket.id
        });
    }
    io.to(ticket.status)
        .to("notification")
        .to(ticketId.toString())
        .emit("ticket", {
        action: "update",
        ticket: ticketUpdated
    });
    // TRIGGER: Wallet binding when moving to a binding step
    if (stepId !== undefined && stepId !== oldStepId && userId) {
        (() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const newStep = yield Step_1.default.findByPk(stepId);
                if (newStep === null || newStep === void 0 ? void 0 : newStep.isBindingStep) {
                    // Check if contact already has a wallet owner
                    const contact = yield Contact_1.default.findByPk(ticket.contactId);
                    if (contact && !contact.walletUserId) {
                        // Bind contact to the user who moved the ticket
                        yield contact.update({ walletUserId: userId });
                        logger_1.logger.info(`[WalletBinding] Contact ${contact.id} bound to user ${userId} via step "${newStep.name}"`);
                    }
                }
            }
            catch (error) {
                logger_1.logger.error(`Error in wallet binding trigger for ticket #${ticket.id}:`, error);
            }
        }))();
    }
    // TRIGGER: Process embeddings when ticket is closed (async, non-blocking)
    if (status === "closed" && oldStatus !== "closed" && !ticket.isGroup) {
        // Run async to not block the response
        (() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // Check if AI is enabled for this tenant
                const [aiEnabled, aiAssistantEnabled] = yield Promise.all([
                    Setting_1.default.findOne({ where: { key: "aiEnabled", tenantId: ticket.tenantId } }),
                    Setting_1.default.findOne({ where: { key: "aiAssistantEnabled", tenantId: ticket.tenantId } })
                ]);
                if ((aiEnabled === null || aiEnabled === void 0 ? void 0 : aiEnabled.value) === "true" && (aiAssistantEnabled === null || aiAssistantEnabled === void 0 ? void 0 : aiAssistantEnabled.value) === "true") {
                    logger_1.logger.info(`Processing embeddings for closed ticket #${ticket.id}`);
                    yield EmbeddingService_1.default.processTicket(ticket.id, ticket.tenantId);
                    logger_1.logger.info(`Embeddings processed successfully for ticket #${ticket.id}`);
                }
            }
            catch (error) {
                logger_1.logger.error(`Error processing embeddings for ticket #${ticket.id}:`, error);
            }
        }))();
    }
    return { ticket, oldStatus, oldUserId };
});
exports.default = UpdateTicketService;
