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
const socket_1 = require("../../libs/socket");
const Message_1 = __importDefault(require("../../models/Message"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const CreateMessageService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ messageData }) {
    // Check if quotedMsgId refers to an existing message
    if (messageData.quotedMsgId) {
        const quotedMsg = yield Message_1.default.findByPk(messageData.quotedMsgId);
        if (!quotedMsg) {
            // If quoted message does not exist, we cannot reference it in DB due to FK constraint.
            // We log a warning and proceed without the quote reference.
            const { logger } = require("../../utils/logger");
            logger.warn(`[CreateMessageService] Quoted message ${messageData.quotedMsgId} not found. Removing reference to prevent FK error.`);
            messageData.quotedMsgId = null;
        }
    }
    yield Message_1.default.upsert(messageData);
    const message = yield Message_1.default.findByPk(messageData.id, {
        include: [
            "contact",
            {
                model: Ticket_1.default,
                as: "ticket",
                include: [
                    "contact",
                    "queue",
                    {
                        model: Whatsapp_1.default,
                        as: "whatsapp",
                        attributes: ["name"]
                    }
                ]
            },
            {
                model: Message_1.default,
                as: "quotedMsg",
                include: ["contact"]
            }
        ]
    });
    if (!message) {
        throw new Error("ERR_CREATING_MESSAGE");
    }
    // Atualizar lastMessage do ticket para manter sidebar sincronizada
    // Só atualiza se a mensagem for mais recente que a última
    if (message.ticket && messageData.body) {
        yield Ticket_1.default.update({
            lastMessage: messageData.body,
            updatedAt: new Date()
        }, { where: { id: message.ticketId } });
        // Atualizar o objeto ticket no retorno
        message.ticket.lastMessage = messageData.body;
        message.ticket.updatedAt = new Date();
    }
    const io = (0, socket_1.getIO)();
    io.to(message.ticketId.toString())
        .to(message.ticket.status)
        .to("notification")
        .emit("appMessage", {
        action: "create",
        message,
        ticket: message.ticket,
        contact: message.ticket.contact
    });
    const { logger } = require("../../utils/logger");
    logger.info(`[CreateMessageService] Emitted appMessage create for msg ${message.id} ticket ${message.ticketId}`);
    return message;
});
exports.default = CreateMessageService;
