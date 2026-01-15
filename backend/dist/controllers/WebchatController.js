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
exports.saveMessage = exports.createTicket = exports.getConfig = void 0;
const uuid_1 = require("uuid");
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const FindOrCreateTicketService_1 = __importDefault(require("../services/TicketServices/FindOrCreateTicketService"));
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const Contact_1 = __importDefault(require("../models/Contact"));
const Message_1 = __importDefault(require("../models/Message"));
const socket_1 = require("../libs/socket");
const getConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { whatsappId } = req.params;
    const whatsapp = yield Whatsapp_1.default.findByPk(whatsappId);
    if (!whatsapp || whatsapp.type !== "webchat") {
        return res.status(404).json({ error: "Webchat not found" });
    }
    return res.json({
        title: ((_a = whatsapp.chatConfig) === null || _a === void 0 ? void 0 : _a.title) || "Suporte",
        primaryColor: ((_b = whatsapp.chatConfig) === null || _b === void 0 ? void 0 : _b.primaryColor) || "#000000",
        icon: ((_c = whatsapp.chatConfig) === null || _c === void 0 ? void 0 : _c.icon) || "chat",
        greetingMessage: whatsapp.greetingMessage,
        farewellMessage: whatsapp.farewellMessage,
        startMessage: ((_d = whatsapp.chatConfig) === null || _d === void 0 ? void 0 : _d.startMessage) || "Olá! Como podemos ajudar?",
    });
});
exports.getConfig = getConfig;
const createTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { whatsappId } = req.params;
    const { name, email, phone, message } = req.body;
    const whatsapp = yield Whatsapp_1.default.findByPk(whatsappId);
    if (!whatsapp || whatsapp.type !== "webchat") {
        return res.status(404).json({ error: "Webchat not found" });
    }
    // Find or Create Contact
    let contact = yield Contact_1.default.findOne({ where: { email, tenantId: whatsapp.tenantId } });
    if (!contact) {
        const number = phone || `webchat-${Date.now()}`;
        contact = yield Contact_1.default.create({
            name,
            number,
            email,
            tenantId: whatsapp.tenantId,
            isGroup: false
        });
    }
    // Find or Create Ticket
    const ticket = yield (0, FindOrCreateTicketService_1.default)(contact, whatsapp.id, 1, // unreadMessages
    whatsapp.tenantId);
    // Update Ticket status to open if needed
    if (ticket.status === "closed") {
        yield ticket.update({ status: "pending" });
    }
    // Send initial message from user
    if (message) {
        const messageData = {
            id: (0, uuid_1.v4)(),
            ticketId: ticket.id,
            contactId: contact.id,
            body: message,
            fromMe: false,
            mediaType: "chat",
            read: false,
            quotedMsgId: null,
            ack: 1,
            tenantId: whatsapp.tenantId,
            dataJson: JSON.stringify({ from: "webchat" })
        };
        const createdMessage = yield Message_1.default.create(messageData);
        const io = (0, socket_1.getIO)();
        io.to(`tenant:${whatsapp.tenantId}:notification`).emit(`tenant:${whatsapp.tenantId}:ticket`, {
            action: "update",
            ticket
        });
        io.to(`tenant:${whatsapp.tenantId}:${ticket.id}`).emit(`tenant:${whatsapp.tenantId}:appMessage`, {
            action: "create",
            message: createdMessage,
            ticket: ticket,
            contact: ticket.contact
        });
    }
    return res.json({ ticketId: ticket.id, contactId: contact.id });
});
exports.createTicket = createTicket;
const saveMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const { body, contactId } = req.body;
    const ticket = yield (0, ShowTicketService_1.default)(ticketId); // We need to check tenant
    // Workaround: Fetch ticket directly to get tenantId if ShowTicketService doesn't return it (it returns Ticket model so it should)
    if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
    }
    const messageData = {
        id: (0, uuid_1.v4)(),
        ticketId: Number(ticketId),
        contactId: contactId,
        body,
        fromMe: false,
        mediaType: "chat",
        read: false,
        quotedMsgId: null,
        ack: 1,
        tenantId: ticket.tenantId,
        dataJson: JSON.stringify({ from: "webchat" })
    };
    const createdMessage = yield Message_1.default.create(messageData);
    const io = (0, socket_1.getIO)();
    io.to(`tenant:${ticket.tenantId}:${ticketId}`).emit(`tenant:${ticket.tenantId}:appMessage`, {
        action: "create",
        message: createdMessage,
        ticket: ticket,
        contact: ticket.contact
    });
    // Update ticket last message
    yield ticket.update({
        lastMessage: body,
        updatedAt: new Date(),
        unreadMessages: (ticket.unreadMessages || 0) + 1
    });
    io.to(`tenant:${ticket.tenantId}:notification`).emit(`tenant:${ticket.tenantId}:ticket`, {
        action: "update",
        ticket: ticket
    });
    return res.json({ success: true, message: createdMessage });
});
exports.saveMessage = saveMessage;
