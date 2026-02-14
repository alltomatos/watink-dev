"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCarousel = exports.sendPoll = exports.sendList = exports.sendButtons = void 0;
const uuid_1 = require("uuid");
const RabbitMQService_1 = __importDefault(require("../services/RabbitMQService"));
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const getRouteParts = async (ticketId, tenantId) => {
    const ticket = await (0, ShowTicketService_1.default)(ticketId, tenantId);
    const contactNumber = ticket.contact.number.replace(/\D/g, "");
    const engineType = ticket.whatsapp?.engineType || "whaileys";
    const sessionId = ticket.whatsappId;
    const to = `${contactNumber}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
    return { ticket, engineType, sessionId, to };
};
const sendButtons = async (req, res) => {
    const { tenantId } = req.user;
    const { ticketId, text, footer, buttons, imageUrl } = req.body;
    const { engineType, sessionId, to } = await getRouteParts(ticketId, tenantId);
    const command = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        tenantId,
        type: "message.send.buttons",
        payload: { sessionId, to, text, footer, buttons, imageUrl }
    };
    const routingKey = RabbitMQService_1.default.generateRoutingKey(tenantId, engineType, sessionId, "message.send.buttons");
    await RabbitMQService_1.default.publishCommand(routingKey, command);
    return res.status(200).json({ message: "Command sent to queue" });
};
exports.sendButtons = sendButtons;
const sendList = async (req, res) => {
    const { tenantId } = req.user;
    const { ticketId, text, footer, buttonText, sections } = req.body;
    const { engineType, sessionId, to } = await getRouteParts(ticketId, tenantId);
    const command = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        tenantId,
        type: "message.send.list",
        payload: { sessionId, to, text, footer, buttonText, sections }
    };
    const routingKey = RabbitMQService_1.default.generateRoutingKey(tenantId, engineType, sessionId, "message.send.list");
    await RabbitMQService_1.default.publishCommand(routingKey, command);
    return res.status(200).json({ message: "Command sent to queue" });
};
exports.sendList = sendList;
const sendPoll = async (req, res) => {
    const { tenantId } = req.user;
    const { ticketId, name, options, selectableCount } = req.body;
    const { engineType, sessionId, to } = await getRouteParts(ticketId, tenantId);
    const command = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        tenantId,
        type: "message.send.poll",
        payload: { sessionId, to, name, options, selectableCount }
    };
    const routingKey = RabbitMQService_1.default.generateRoutingKey(tenantId, engineType, sessionId, "message.send.poll");
    await RabbitMQService_1.default.publishCommand(routingKey, command);
    return res.status(200).json({ message: "Command sent to queue" });
};
exports.sendPoll = sendPoll;
const sendCarousel = async (req, res) => {
    const { tenantId } = req.user;
    const { ticketId, text, footer, cards } = req.body;
    const { engineType, sessionId, to } = await getRouteParts(ticketId, tenantId);
    const command = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        tenantId,
        type: "message.send.carousel",
        payload: { sessionId, to, text, footer, cards }
    };
    const routingKey = RabbitMQService_1.default.generateRoutingKey(tenantId, engineType, sessionId, "message.send.carousel");
    await RabbitMQService_1.default.publishCommand(routingKey, command);
    return res.status(200).json({ message: "Command sent to queue" });
};
exports.sendCarousel = sendCarousel;
