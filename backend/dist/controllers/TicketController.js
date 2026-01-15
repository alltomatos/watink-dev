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
exports.showParticipants = exports.closeAll = exports.syncHistory = exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const uuid_1 = require("uuid");
const CreateTicketService_1 = __importDefault(require("../services/TicketServices/CreateTicketService"));
const DeleteTicketService_1 = __importDefault(require("../services/TicketServices/DeleteTicketService"));
const ListTicketsService_1 = __importDefault(require("../services/TicketServices/ListTicketsService"));
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const UpdateTicketService_1 = __importDefault(require("../services/TicketServices/UpdateTicketService"));
const CloseAllTicketsService_1 = __importDefault(require("../services/TicketServices/CloseAllTicketsService"));
const SendWhatsAppMessage_1 = __importDefault(require("../services/WbotServices/SendWhatsAppMessage"));
const ShowWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppService"));
const ShowUserService_1 = __importDefault(require("../services/UserServices/ShowUserService"));
const Mustache_1 = __importDefault(require("../helpers/Mustache"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const RabbitMQService_1 = __importDefault(require("../services/RabbitMQService"));
const Message_1 = __importDefault(require("../models/Message"));
const Contact_1 = __importDefault(require("../models/Contact"));
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageNumber, status, date, searchParam, showAll, queueIds: queueIdsStringified, withUnreadMessages, isGroup } = req.query;
    const userId = req.user.id;
    let queueIds = [];
    if (queueIdsStringified) {
        queueIds = JSON.parse(queueIdsStringified);
    }
    // Enforce Queue Isolation for non-admin users
    const user = yield (0, ShowUserService_1.default)(userId);
    if (user.profile !== "admin" && user.profile !== "auditor") {
        const userQueueIds = user.queues.map((queue) => queue.id);
        if (queueIds.length > 0) {
            // If user requested specific queues, filter to only include ones they belong to
            queueIds = queueIds.filter((id) => userQueueIds.includes(id));
            // If the intersection is empty (user asked for queues they don't have), 
            // we might want to return empty or just let it pass (which results in no tickets)
        }
        else {
            // If no queues requested, restricts to ALL their queues
            queueIds = userQueueIds;
        }
    }
    const { tickets, count, hasMore } = yield (0, ListTicketsService_1.default)({
        searchParam,
        pageNumber,
        status,
        date,
        showAll,
        userId,
        queueIds,
        withUnreadMessages,
        isGroup
    });
    return res.status(200).json({ tickets, count, hasMore });
});
exports.index = index;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { contactId, status, userId } = req.body;
    const ticket = yield (0, CreateTicketService_1.default)({ contactId, status, userId });
    const io = (0, socket_1.getIO)();
    io.to(ticket.status).emit("ticket", {
        action: "update",
        ticket
    });
    return res.status(200).json(ticket);
});
exports.store = store;
const show = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const contact = yield (0, ShowTicketService_1.default)(ticketId);
    return res.status(200).json(contact);
});
exports.show = show;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const ticketData = req.body;
    const { ticket } = yield (0, UpdateTicketService_1.default)({
        ticketData,
        ticketId
    });
    if (ticket.status === "closed") {
        const whatsapp = yield (0, ShowWhatsAppService_1.default)(ticket.whatsappId);
        const { farewellMessage } = whatsapp;
        if (farewellMessage) {
            yield (0, SendWhatsAppMessage_1.default)({
                body: (0, Mustache_1.default)(farewellMessage, ticket.contact),
                ticket
            });
        }
    }
    return res.status(200).json(ticket);
});
exports.update = update;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const ticket = yield (0, DeleteTicketService_1.default)(ticketId);
    const io = (0, socket_1.getIO)();
    io.to(ticket.status).to(ticketId).to("notification").emit("ticket", {
        action: "delete",
        ticketId: +ticketId
    });
    return res.status(200).json({ message: "ticket deleted" });
});
exports.remove = remove;
// Novo: Buscar histórico de mensagens sob demanda
const syncHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { ticketId } = req.params;
    const { fromDate, toDate } = req.body;
    const { tenantId } = req.user;
    if (!fromDate) {
        throw new AppError_1.default("ERR_DATE_REQUIRED", 400);
    }
    const ticket = yield Ticket_1.default.findByPk(ticketId, {
        include: ["contact", "whatsapp"]
    });
    if (!ticket) {
        throw new AppError_1.default("ERR_NO_TICKET_FOUND", 404);
    }
    if (!ticket.whatsapp || ticket.whatsapp.status !== "CONNECTED") {
        throw new AppError_1.default("ERR_WHATSAPP_NOT_CONNECTED", 400);
    }
    const contactNumber = ((_a = ticket.contact) === null || _a === void 0 ? void 0 : _a.number) || ((_b = ticket.contact) === null || _b === void 0 ? void 0 : _b.lid) || "";
    if (!contactNumber) {
        throw new AppError_1.default("ERR_NO_CONTACT_NUMBER", 400);
    }
    const command = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        tenantId,
        type: "history.sync",
        payload: {
            sessionId: ticket.whatsappId,
            ticketId: ticket.id,
            contactId: ticket.contactId,
            contactNumber,
            fromDate,
            toDate: toDate || new Date().toISOString()
        }
    };
    yield RabbitMQService_1.default.publishCommand(`wbot.${tenantId}.${ticket.whatsappId}.history.sync`, command);
    return res.status(202).json({
        message: "Sincronização de histórico iniciada",
        ticketId: ticket.id
    });
});
exports.syncHistory = syncHistory;
const closeAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const userId = Number(req.user.id);
    const { statusOpen, statusPending, includeGroups } = req.body;
    const closedCount = yield (0, CloseAllTicketsService_1.default)({
        tenantId,
        userId,
        statusOpen,
        statusPending,
        includeGroups
    });
    return res.status(200).json({ closedCount });
});
exports.closeAll = closeAll;
const showParticipants = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    // Find distinct contacts who sent messages in this ticket
    const messages = yield Message_1.default.findAll({
        where: { ticketId },
        attributes: ["contactId"],
        group: ["contactId"]
    });
    const contactIds = messages.map(m => m.contactId);
    const participants = yield Contact_1.default.findAll({
        where: {
            id: contactIds
        },
        attributes: ["id", "name", "number", "profilePicUrl"]
    });
    return res.status(200).json(participants);
});
exports.showParticipants = showParticipants;
