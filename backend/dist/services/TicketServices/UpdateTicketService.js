"use strict";
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
const UpdateTicketService = async ({ ticketData, ticketId }) => {
    const { status, userId, queueId, whatsappId, stepId } = ticketData;
    const ticket = await (0, ShowTicketService_1.default)(ticketId);
    await (0, SetTicketMessagesAsRead_1.default)(ticket);
    if (whatsappId && ticket.whatsappId !== whatsappId) {
        await (0, CheckContactOpenTickets_1.default)(ticket.contactId, whatsappId);
    }
    const oldStatus = ticket.status;
    const oldUserId = ticket.user?.id;
    const oldStepId = ticket.stepId;
    if (oldStatus === "closed") {
        await (0, CheckContactOpenTickets_1.default)(ticket.contact.id, ticket.whatsappId);
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
    await ticket.update(updateData);
    if (ticketData.tags) {
        await EntityTagService_1.default.SyncEntityTags({
            tagIds: ticketData.tags,
            entityType: "ticket",
            entityId: ticket.id,
            tenantId: ticket.tenantId
        });
    }
    if (whatsappId) {
        await ticket.update({
            whatsappId
        });
    }
    const ticketUpdated = await (0, ShowTicketService_1.default)(ticket.id);
    const io = (0, socket_1.getIO)();
    if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {
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
        (async () => {
            try {
                const newStep = await Step_1.default.findByPk(stepId);
                if (newStep?.isBindingStep) {
                    // Check if contact already has a wallet owner
                    const contact = await Contact_1.default.findByPk(ticket.contactId);
                    if (contact && !contact.walletUserId) {
                        // Bind contact to the user who moved the ticket
                        await contact.update({ walletUserId: userId });
                        logger_1.logger.info(`[WalletBinding] Contact ${contact.id} bound to user ${userId} via step "${newStep.name}"`);
                    }
                }
            }
            catch (error) {
                logger_1.logger.error(`Error in wallet binding trigger for ticket #${ticket.id}:`, error);
            }
        })();
    }
    // TRIGGER: Process embeddings when ticket is closed (async, non-blocking)
    if (status === "closed" && oldStatus !== "closed" && !ticket.isGroup) {
        // Run async to not block the response
        (async () => {
            try {
                // Check if AI is enabled for this tenant
                const [aiEnabled, aiAssistantEnabled] = await Promise.all([
                    Setting_1.default.findOne({ where: { key: "aiEnabled", tenantId: ticket.tenantId } }),
                    Setting_1.default.findOne({ where: { key: "aiAssistantEnabled", tenantId: ticket.tenantId } })
                ]);
                if (aiEnabled?.value === "true" && aiAssistantEnabled?.value === "true") {
                    logger_1.logger.info(`Processing embeddings for closed ticket #${ticket.id}`);
                    await EmbeddingService_1.default.processTicket(ticket.id, ticket.tenantId);
                    logger_1.logger.info(`Embeddings processed successfully for ticket #${ticket.id}`);
                }
            }
            catch (error) {
                logger_1.logger.error(`Error processing embeddings for ticket #${ticket.id}:`, error);
            }
        })();
    }
    return { ticket, oldStatus, oldUserId };
};
exports.default = UpdateTicketService;
