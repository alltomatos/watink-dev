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
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const Message_1 = __importDefault(require("../../models/Message"));
const GenerateWAMessageId_1 = __importDefault(require("../../helpers/GenerateWAMessageId"));
const socket_1 = require("../../libs/socket");
const SendWhatsAppUrlButton = (_a) => __awaiter(void 0, [_a], void 0, function* ({ body, ticket, footer, title, url, buttonText }) {
    try {
        const formattedBody = (0, Mustache_1.default)(body, ticket.contact);
        const id = (0, uuid_1.v4)();
        const sessionId = ticket.whatsappId;
        const contactNumber = ticket.contact.number.replace(/\D/g, "");
        const to = `${contactNumber}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
        const messageData = {
            id: (0, GenerateWAMessageId_1.default)(),
            ticketId: ticket.id,
            contactId: undefined,
            body: formattedBody,
            fromMe: true,
            mediaType: "interactive",
            read: true,
            quotedMsgId: undefined,
            ack: 0,
            timestamp: new Date().getTime(),
            tenantId: ticket.tenantId,
            dataJson: JSON.stringify({
                type: "interactive",
                interactiveType: "url_button",
                url,
                buttonText
            })
        };
        const message = yield Message_1.default.create(messageData);
        const io = (0, socket_1.getIO)();
        io.to(message.ticketId.toString()).emit("appMessage", {
            action: "create",
            message,
            ticket: ticket,
            contact: ticket.contact
        });
        // Construct payload for message.send.interactive
        const payload = {
            sessionId,
            messageId: message.id,
            to,
            text: formattedBody,
            footer: footer || "",
            buttons: [
                {
                    type: "url",
                    text: buttonText,
                    url: url
                }
            ]
        };
        const command = {
            id,
            timestamp: Date.now(),
            tenantId: ticket.tenantId,
            type: "message.send.interactive",
            payload
        };
        const routingKey = `wbot.${ticket.tenantId}.${sessionId}.message.send.interactive`;
        yield RabbitMQService_1.default.publishCommand(routingKey, command);
        yield ticket.update({ lastMessage: body });
        return message;
    }
    catch (err) {
        console.error(err);
        throw new AppError_1.default("ERR_SENDING_WAPP_URL_BUTTON");
    }
});
exports.default = SendWhatsAppUrlButton;
