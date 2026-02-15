"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const RabbitMQService_1 = __importDefault(require("../services/RabbitMQService"));
const socket_1 = require("../libs/socket");
const Message_1 = __importDefault(require("../models/Message"));
const logger_1 = require("../utils/logger");
const SetTicketMessagesAsRead = async (ticket) => {
    try {
        // 1. Find unread messages (received only, since we don't mark our own messages as read for ourselves)
        const unreadMessages = await Message_1.default.findAll({
            where: {
                ticketId: ticket.id,
                read: false,
                fromMe: false // Only mark received messages as read
            },
            attributes: ["id"]
        });
        const unreadMessageIds = unreadMessages.map(m => m.id);
        // 2. Update messages to read = true in DB
        if (unreadMessageIds.length > 0) {
            await Message_1.default.update({ read: true }, {
                where: {
                    ticketId: ticket.id,
                    read: false
                }
            });
            // 3. Publish command to Engine to mark as read in WhatsApp
            const markReadPayload = {
                sessionId: ticket.whatsappId, // Assuming ticket has whatsappId
                to: `${ticket.contact.number} @${ticket.isGroup ? "g" : "c"}.us`,
                messageIds: unreadMessageIds
            };
            const command = {
                id: (0, uuid_1.v4)(),
                timestamp: Date.now(),
                tenantId: ticket.tenantId,
                type: "message.markAsRead",
                payload: markReadPayload
            };
            await RabbitMQService_1.default.publishCommand(`wbot.${ticket.tenantId}.${ticket.whatsappId}.message.markAsRead`, command);
        }
        // 4. Update ticket unread count
        await ticket.update({ unreadMessages: 0 });
    }
    catch (err) {
        logger_1.logger.warn(`Could not mark messages as read.Err: ${err} `);
    }
    const io = (0, socket_1.getIO)();
    io.to(ticket.status).to("notification").emit("ticket", {
        action: "updateUnread",
        ticketId: ticket.id
    });
};
exports.default = SetTicketMessagesAsRead;
