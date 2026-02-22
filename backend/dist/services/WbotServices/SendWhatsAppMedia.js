"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const upload_1 = __importDefault(require("../../config/upload"));
const uuid_1 = require("uuid");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const Message_1 = __importDefault(require("../../models/Message"));
const socket_1 = require("../../libs/socket");
const GenerateWAMessageId_1 = __importDefault(require("../../helpers/GenerateWAMessageId"));
const SendWhatsAppMedia = async ({ media, ticket, body, mentionedIds }) => {
    try {
        const hasBody = body
            ? (0, Mustache_1.default)(body, ticket.contact)
            : undefined;
        // Read file and convert to base64
        const fileData = fs_1.default.readFileSync(media.path, { encoding: "base64" });
        // Move file to tenant folder
        const tenantFolder = path_1.default.join(upload_1.default.directory, ticket.tenantId.toString());
        if (!fs_1.default.existsSync(tenantFolder)) {
            fs_1.default.mkdirSync(tenantFolder, { recursive: true });
        }
        const newPath = path_1.default.join(tenantFolder, media.filename);
        fs_1.default.renameSync(media.path, newPath);
        // Sanitize number to ensure only digits
        const contactNumber = ticket.contact.number.replace(/\D/g, "");
        const messageData = {
            id: (0, GenerateWAMessageId_1.default)(),
            ticketId: ticket.id,
            contactId: undefined,
            body: body || media.originalname,
            fromMe: true,
            mediaType: media.mimetype.split("/")[0],
            read: true,
            quotedMsgId: undefined,
            ack: 0, // Pending
            timestamp: new Date().getTime(),
            mediaUrl: `${ticket.tenantId}/${media.filename}`,
            tenantId: ticket.tenantId
        };
        const message = await Message_1.default.create(messageData);
        const io = (0, socket_1.getIO)();
        io.to(message.ticketId.toString()).emit("appMessage", {
            action: "create",
            message,
            ticket: ticket,
            contact: ticket.contact
        });
        const command = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            tenantId: ticket.tenantId,
            type: "message.send.media",
            payload: {
                sessionId: ticket.whatsappId,
                messageId: message.id,
                to: `${contactNumber}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                lid: ticket.contact.lid || undefined,
                caption: hasBody,
                mentions: mentionedIds,
                media: {
                    mimetype: media.mimetype,
                    filename: media.originalname,
                    data: fileData
                }
            }
        };
        await RabbitMQService_1.default.publishCommand(`wbot.${ticket.tenantId}.${ticket.whatsappId}.message.send.media`, command);
        await ticket.update({ lastMessage: body || media.originalname });
        return message;
    }
    catch (err) {
        console.log(err);
        throw new AppError_1.default("ERR_SENDING_WAPP_MSG");
    }
};
exports.default = SendWhatsAppMedia;
