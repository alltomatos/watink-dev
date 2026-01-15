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
const uuid_1 = require("uuid");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const Message_1 = __importDefault(require("../../models/Message"));
const socket_1 = require("../../libs/socket");
const GenerateWAMessageId_1 = __importDefault(require("../../helpers/GenerateWAMessageId"));
const SendWhatsAppMessage = (_a) => __awaiter(void 0, [_a], void 0, function* ({ body, ticket, quotedMsg, mentionedIds }) {
    var _b;
    try {
        const formattedBody = (0, Mustache_1.default)(body, ticket.contact);
        if (!ticket.whatsappId) {
            throw new AppError_1.default("ERR_TICKET_WRONG_WHATSAPP_ID");
        }
        // Sanitize number to ensure only digits
        const contactNumber = ticket.contact.number.replace(/\D/g, "");
        const messageData = {
            id: (0, GenerateWAMessageId_1.default)(),
            ticketId: ticket.id,
            contactId: undefined,
            body: formattedBody,
            fromMe: true,
            mediaType: "chat",
            read: true,
            quotedMsgId: quotedMsg === null || quotedMsg === void 0 ? void 0 : quotedMsg.id,
            ack: 0, // Pending
            timestamp: new Date().getTime(),
            tenantId: ticket.tenantId
        };
        const message = yield Message_1.default.create(messageData);
        const messageComplete = yield Message_1.default.findByPk(message.id, {
            include: [
                { model: Ticket_1.default, as: "ticket" },
                { model: Message_1.default, as: "quotedMsg", include: ["contact"] }
            ]
        });
        const io = (0, socket_1.getIO)();
        io.to(message.ticketId.toString()).emit("appMessage", {
            action: "create",
            message: messageComplete || message,
            ticket: ticket,
            contact: ticket.contact
        });
        const command = {
            id: (0, uuid_1.v4)(), // Envelope ID
            timestamp: Date.now(),
            tenantId: ticket.tenantId,
            type: "message.send.text",
            payload: {
                sessionId: ticket.whatsappId,
                messageId: message.id, // Passing the created message ID
                to: `${contactNumber}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                lid: ticket.contact.lid || undefined, // Pass LID if available
                body: formattedBody,
                mentions: mentionedIds,
                options: {
                    quotedMsgId: quotedMsg === null || quotedMsg === void 0 ? void 0 : quotedMsg.id,
                    quoted: quotedMsg ? {
                        key: {
                            id: quotedMsg.id,
                            fromMe: quotedMsg.fromMe,
                            participant: quotedMsg.isGroup ? quotedMsg.participant || ((_b = quotedMsg.contact) === null || _b === void 0 ? void 0 : _b.number) + "@s.whatsapp.net" : undefined
                        },
                        message: quotedMsg.dataJson // Optional but helpful
                    } : undefined
                }
            }
        };
        yield RabbitMQService_1.default.publishCommand(`wbot.${ticket.tenantId}.${ticket.whatsappId}.message.send.text`, command);
        yield ticket.update({ lastMessage: body });
        return message;
    }
    catch (err) {
        const { logger } = require("../../utils/logger");
        logger.error(`[SendWhatsAppMessage] Error sending message: ticketId=${ticket.id} isGroup=${ticket.isGroup}`);
        logger.error(err);
        throw new AppError_1.default("ERR_SENDING_WAPP_MSG");
    }
});
exports.default = SendWhatsAppMessage;
