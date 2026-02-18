"use strict";
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
const SendWhatsAppInteractive = async ({ body, ticket, buttons, list }) => {
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
            mediaType: "chat",
            read: true,
            quotedMsgId: undefined,
            ack: 0,
            timestamp: new Date().getTime()
        };
        const message = await Message_1.default.create(messageData);
        let command;
        let routingKey = "";
        if (buttons && buttons.length > 0) {
            const payload = {
                sessionId,
                messageId: message.id,
                to,
                text: formattedBody,
                buttons: buttons.map(b => ({
                    buttonId: b.id,
                    buttonText: b.label
                }))
            };
            command = {
                id,
                timestamp: Date.now(),
                tenantId: ticket.tenantId,
                type: "message.send.buttons",
                payload
            };
            routingKey = `wbot.1.${sessionId}.message.send.buttons`;
        }
        else if (list) {
            const payload = {
                sessionId,
                messageId: message.id,
                to,
                text: formattedBody,
                buttonText: list.buttonText || "Opções",
                sections: list.sections.map(s => ({
                    title: s.title,
                    rows: s.rows.map(r => ({
                        rowId: r.id,
                        title: r.title,
                        description: r.description
                    }))
                }))
            };
            command = {
                id,
                timestamp: Date.now(),
                tenantId: ticket.tenantId,
                type: "message.send.list",
                payload
            };
            routingKey = `wbot.1.${sessionId}.message.send.list`;
        }
        else {
            throw new Error("Invalid interactive message: must have buttons or list");
        }
        await RabbitMQService_1.default.publishCommand(routingKey, command);
        await ticket.update({ lastMessage: body });
        return message;
    }
    catch (err) {
        throw new AppError_1.default("ERR_SENDING_WAPP_INTERACTIVE");
    }
};
exports.default = SendWhatsAppInteractive;
