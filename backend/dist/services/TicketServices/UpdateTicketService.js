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
const Setting_1 = __importDefault(require("../../models/Setting"));
const ShowTicketService_1 = __importDefault(require("./ShowTicketService"));
const EmbeddingService_1 = __importDefault(require("../AIServices/EmbeddingService"));
const logger_1 = require("../../utils/logger");
const UpdateTicketService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ ticketData, ticketId }) {
    var _b, _c;
    const { status, userId, queueId, whatsappId } = ticketData;
    const ticket = yield (0, ShowTicketService_1.default)(ticketId);
    yield (0, SetTicketMessagesAsRead_1.default)(ticket);
    if (whatsappId && ticket.whatsappId !== whatsappId) {
        yield (0, CheckContactOpenTickets_1.default)(ticket.contactId, whatsappId);
    }
    const oldStatus = ticket.status;
    const oldUserId = (_b = ticket.user) === null || _b === void 0 ? void 0 : _b.id;
    if (oldStatus === "closed") {
        yield (0, CheckContactOpenTickets_1.default)(ticket.contact.id, ticket.whatsappId);
    }
    yield ticket.update({
        status,
        queueId,
        userId
    });
    if (whatsappId) {
        yield ticket.update({
            whatsappId
        });
    }
    yield ticket.reload();
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
        ticket
    });
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
