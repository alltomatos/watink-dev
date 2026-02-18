"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CheckContactOpenTickets_1 = __importDefault(require("../../helpers/CheckContactOpenTickets"));
const SetTicketMessagesAsRead_1 = __importDefault(require("../../helpers/SetTicketMessagesAsRead"));
const socket_1 = require("../../libs/socket");
const Setting_1 = __importDefault(require("../../models/Setting"));
const ShowTicketService_1 = __importDefault(require("./ShowTicketService"));
const EmbeddingService_1 = __importDefault(require("../AIServices/EmbeddingService"));
const logger_1 = require("../../utils/logger");
const UpdateTicketService = async ({ ticketData, ticketId }) => {
    const { status, userId, queueId, whatsappId } = ticketData;
    const ticket = await (0, ShowTicketService_1.default)(ticketId);
    await (0, SetTicketMessagesAsRead_1.default)(ticket);
    if (whatsappId && ticket.whatsappId !== whatsappId) {
        await (0, CheckContactOpenTickets_1.default)(ticket.contactId, whatsappId);
    }
    const oldStatus = ticket.status;
    const oldUserId = ticket.user?.id;
    if (oldStatus === "closed") {
        await (0, CheckContactOpenTickets_1.default)(ticket.contact.id, ticket.whatsappId);
    }
    await ticket.update({
        status,
        queueId,
        userId
    });
    if (whatsappId) {
        await ticket.update({
            whatsappId
        });
    }
    await ticket.reload();
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
        ticket
    });
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
