"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const Message_1 = __importDefault(require("../../models/Message"));
const socket_1 = require("../../libs/socket");
const GenerateWAMessageId_1 = __importDefault(require("../../helpers/GenerateWAMessageId"));
const SendWhatsAppCarousel = async ({ ticket, body, cards }) => {
    try {
        if (!ticket.whatsappId) {
            throw new AppError_1.default("ERR_TICKET_WRONG_WHATSAPP_ID");
        }
        const contactNumber = ticket.contact.number.replace(/\D/g, "");
        // Create message in DB as a placeholder/log
        const messageData = {
            id: (0, GenerateWAMessageId_1.default)(),
            ticketId: ticket.id,
            contactId: undefined,
            body: body,
            fromMe: true,
            mediaType: "carousel", // or "template" / "interactive" depending on how frontend renders it, but "carousel" is specific
            read: true,
            quotedMsgId: null,
            ack: 0,
            timestamp: new Date().getTime(),
            tenantId: ticket.tenantId,
            dataJson: JSON.stringify({ cards })
        };
        const message = await Message_1.default.create(messageData);
        const io = (0, socket_1.getIO)();
        io.to(message.ticketId.toString()).emit("appMessage", {
            action: "create",
            message,
            ticket: ticket,
            contact: ticket.contact
        });
        // Contruct Envelope for message.send.carousel
        // Based on contracts.ts SendCarouselPayload
        const command = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            tenantId: ticket.tenantId,
            type: "message.send.carousel",
            payload: {
                sessionId: ticket.whatsappId,
                messageId: message.id,
                to: `${contactNumber}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                text: "Verifique as opções abaixo:", // Main message text required by some flows or fallback
                cards: cards.map(c => ({
                    header: {
                        title: c.title,
                        subtitle: c.subtitle || "",
                        imageUrl: c.headerUrl || ""
                    },
                    body: c.body,
                    footer: c.footer || "",
                    buttons: c.buttons.map(b => ({
                        type: b.type,
                        displayText: b.text,
                        url: b.url,
                        id: b.buttonId
                    }))
                }))
            }
        };
        await RabbitMQService_1.default.publishCommand(`wbot.${ticket.tenantId}.${ticket.whatsappId}.message.send.carousel`, command);
        await ticket.update({ lastMessage: body });
        return message;
    }
    catch (err) {
        console.error(err);
        throw new AppError_1.default("ERR_SENDING_WAPP_MSG");
    }
};
exports.default = SendWhatsAppCarousel;
