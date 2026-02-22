"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveMessage = exports.listMessages = exports.createTicket = exports.getConfig = void 0;
const uuid_1 = require("uuid");
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const Contact_1 = __importDefault(require("../models/Contact"));
const FindOrCreateTicketService_1 = __importDefault(require("../services/TicketServices/FindOrCreateTicketService"));
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const RabbitMQService_1 = __importDefault(require("../services/RabbitMQService"));
const getConfig = async (req, res) => {
    const { whatsappId } = req.params;
    const whatsapp = await Whatsapp_1.default.findByPk(whatsappId);
    if (!whatsapp || whatsapp.type !== "webchat") {
        return res.status(404).json({ error: "Webchat not found" });
    }
    return res.json({
        name: whatsapp.name,
        greetingMessage: whatsapp.greetingMessage,
        farewellMessage: whatsapp.farewellMessage,
        chatConfig: whatsapp.chatConfig
    });
};
exports.getConfig = getConfig;
const createTicket = async (req, res) => {
    const { whatsappId } = req.params;
    const { name, email, phone, message } = req.body;
    const whatsapp = await Whatsapp_1.default.findByPk(whatsappId);
    if (!whatsapp || whatsapp.type !== "webchat") {
        return res.status(404).json({ error: "Webchat not found" });
    }
    // Find or Create Contact
    let contact = await Contact_1.default.findOne({ where: { email, tenantId: whatsapp.tenantId } });
    if (!contact) {
        const number = phone || `webchat-${Date.now()}`;
        contact = await Contact_1.default.create({
            name,
            number,
            email,
            tenantId: whatsapp.tenantId,
            isGroup: false
        });
    }
    // Find or Create Ticket
    const ticket = await (0, FindOrCreateTicketService_1.default)(contact, whatsapp.id, 1, // unreadMessages
    whatsapp.tenantId);
    // Update Ticket status to open if needed
    if (ticket.status === "closed") {
        await ticket.update({ status: "pending" });
    }
    // Send initial message from user via RabbitMQ
    if (message) {
        const messageId = (0, uuid_1.v4)();
        const payload = {
            sessionId: whatsapp.id,
            message: {
                id: messageId,
                from: contact.number,
                to: whatsapp.number || "",
                body: message,
                fromMe: false,
                isGroup: false,
                type: "chat",
                timestamp: Date.now() / 1000,
                hasMedia: false,
                participant: contact.number,
                profilePicUrl: contact.profilePicUrl,
                pushName: contact.name,
            }
        };
        const envelope = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            tenantId: whatsapp.tenantId,
            type: "message.received",
            payload
        };
        await RabbitMQService_1.default.publishEvent(`wbot.${whatsapp.tenantId}.${whatsapp.id}.message.received`, envelope);
    }
    return res.json({ ticketId: ticket.id, contactId: contact.id });
};
exports.createTicket = createTicket;
const ListMessagesService_1 = __importDefault(require("../services/MessageServices/ListMessagesService"));
const listMessages = async (req, res) => {
    const { ticketId } = req.params;
    const { contactId, pageNumber } = req.query;
    const ticket = await (0, ShowTicketService_1.default)(ticketId);
    if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
    }
    // Security check: ensure ticket belongs to the contact claiming it
    if (ticket.contactId !== Number(contactId)) {
        return res.status(403).json({ error: "Unauthorized" });
    }
    const { count, messages, hasMore } = await (0, ListMessagesService_1.default)({
        pageNumber,
        ticketId
    });
    return res.json({ count, messages, hasMore });
};
exports.listMessages = listMessages;
const saveMessage = async (req, res) => {
    const { ticketId } = req.params;
    const { body } = req.body;
    const ticket = await (0, ShowTicketService_1.default)(ticketId);
    if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
    }
    const whatsapp = await Whatsapp_1.default.findByPk(ticket.whatsappId);
    if (!whatsapp) {
        return res.status(404).json({ error: "Whatsapp not found" });
    }
    // ShowTicketService returns ticket with contact included
    const contact = ticket.contact;
    const messageId = (0, uuid_1.v4)();
    const payload = {
        sessionId: whatsapp.id,
        message: {
            id: messageId,
            from: contact.number,
            to: whatsapp.number || "",
            body: body,
            fromMe: false,
            isGroup: false,
            type: "chat",
            timestamp: Date.now() / 1000,
            hasMedia: false,
            participant: contact.number,
            profilePicUrl: contact.profilePicUrl,
            pushName: contact.name,
        }
    };
    const envelope = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        tenantId: whatsapp.tenantId,
        type: "message.received",
        payload
    };
    await RabbitMQService_1.default.publishEvent(`wbot.${whatsapp.tenantId}.${whatsapp.id}.message.received`, envelope);
    return res.json({ messageId });
};
exports.saveMessage = saveMessage;
