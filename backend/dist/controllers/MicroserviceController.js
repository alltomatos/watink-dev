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
exports.sendCarousel = exports.sendPoll = exports.sendList = exports.sendButtons = void 0;
const uuid_1 = require("uuid");
const RabbitMQService_1 = __importDefault(require("../services/RabbitMQService"));
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const sendButtons = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { ticketId, text, footer, buttons, imageUrl } = req.body;
    const ticket = yield (0, ShowTicketService_1.default)(ticketId);
    const contactNumber = ticket.contact.number.replace(/\D/g, "");
    const command = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        tenantId,
        type: "message.send.buttons",
        payload: {
            sessionId: ticket.whatsappId,
            to: `${contactNumber}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            text,
            footer,
            buttons,
            imageUrl
        }
    };
    yield RabbitMQService_1.default.publishCommand(`wbot.1.${ticket.whatsappId}.message.send.buttons`, command);
    return res.status(200).json({ message: "Command sent to queue" });
});
exports.sendButtons = sendButtons;
const sendList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { ticketId, text, footer, buttonText, sections } = req.body;
    const ticket = yield (0, ShowTicketService_1.default)(ticketId);
    const contactNumber = ticket.contact.number.replace(/\D/g, "");
    const command = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        tenantId,
        type: "message.send.list",
        payload: {
            sessionId: ticket.whatsappId,
            to: `${contactNumber}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            text,
            footer,
            buttonText,
            sections
        }
    };
    yield RabbitMQService_1.default.publishCommand(`wbot.1.${ticket.whatsappId}.message.send.list`, command);
    return res.status(200).json({ message: "Command sent to queue" });
});
exports.sendList = sendList;
const sendPoll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { ticketId, name, options, selectableCount } = req.body;
    const ticket = yield (0, ShowTicketService_1.default)(ticketId);
    const contactNumber = ticket.contact.number.replace(/\D/g, "");
    const command = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        tenantId,
        type: "message.send.poll",
        payload: {
            sessionId: ticket.whatsappId,
            to: `${contactNumber}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            name,
            options,
            selectableCount
        }
    };
    yield RabbitMQService_1.default.publishCommand(`wbot.1.${ticket.whatsappId}.message.send.poll`, command);
    return res.status(200).json({ message: "Command sent to queue" });
});
exports.sendPoll = sendPoll;
const sendCarousel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const { ticketId, text, footer, cards } = req.body;
    const ticket = yield (0, ShowTicketService_1.default)(ticketId);
    const contactNumber = ticket.contact.number.replace(/\D/g, "");
    const command = {
        id: (0, uuid_1.v4)(),
        timestamp: Date.now(),
        tenantId,
        type: "message.send.carousel",
        payload: {
            sessionId: ticket.whatsappId,
            to: `${contactNumber}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            text,
            footer,
            cards
        }
    };
    yield RabbitMQService_1.default.publishCommand(`wbot.1.${ticket.whatsappId}.message.send.carousel`, command);
    return res.status(200).json({ message: "Command sent to queue" });
});
exports.sendCarousel = sendCarousel;
