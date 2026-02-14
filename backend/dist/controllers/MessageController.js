"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertReaction = exports.sendQuickAnswer = exports.remove = exports.store = exports.index = void 0;
const SetTicketMessagesAsRead_1 = __importDefault(require("../helpers/SetTicketMessagesAsRead"));
const socket_1 = require("../libs/socket");
const ListMessagesService_1 = __importDefault(require("../services/MessageServices/ListMessagesService"));
const UpdateMessageReactionService_1 = __importDefault(require("../services/MessageServices/UpdateMessageReactionService"));
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const DeleteWhatsAppMessage_1 = __importDefault(require("../services/WbotServices/DeleteWhatsAppMessage"));
const SendWhatsAppMedia_1 = __importDefault(require("../services/WbotServices/SendWhatsAppMedia"));
const SendWhatsAppMessage_1 = __importDefault(require("../services/WbotServices/SendWhatsAppMessage"));
const SendWhatsAppInteractive_1 = __importDefault(require("../services/WbotServices/SendWhatsAppInteractive"));
const SendWhatsAppCarousel_1 = __importDefault(require("../services/WbotServices/SendWhatsAppCarousel"));
const ShowQuickAnswerService_1 = __importDefault(require("../services/QuickAnswerService/ShowQuickAnswerService"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const index = async (req, res) => {
    const { ticketId } = req.params;
    const { pageNumber } = req.query;
    const { count, messages, ticket, hasMore } = await (0, ListMessagesService_1.default)({
        pageNumber,
        ticketId
    });
    (0, SetTicketMessagesAsRead_1.default)(ticket);
    return res.json({ count, messages, ticket, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { ticketId } = req.params;
    const { body, quotedMsg, mentionedIds } = req.body;
    const medias = req.files;
    const { logger } = require("../utils/logger");
    logger.info(`[MessageController] Store requested for ticket ${ticketId}. Body: ${body}`);
    const ticket = await (0, ShowTicketService_1.default)(ticketId);
    (0, SetTicketMessagesAsRead_1.default)(ticket);
    if (medias && medias.length > 0) {
        // req.body.body can be a string or an array of strings (if multiple bodies sent)
        // Multer/Express handles 'body' field. If multiple fields with same name 'body', it becomes an array.
        // If we appended 'body' for each media in the same order, we expect an array (or string if just 1).
        const bodies = Array.isArray(body) ? body : [body];
        await Promise.all(medias.map(async (media, index) => {
            const caption = bodies[index] !== undefined ? bodies[index] : (bodies[0] || "");
            await (0, SendWhatsAppMedia_1.default)({ media, ticket, body: caption, mentionedIds });
        }));
    }
    else {
        await (0, SendWhatsAppMessage_1.default)({ body, ticket, quotedMsg, mentionedIds });
    }
    return res.send();
};
exports.store = store;
const remove = async (req, res) => {
    const { messageId } = req.params;
    const message = await (0, DeleteWhatsAppMessage_1.default)(messageId);
    const io = (0, socket_1.getIO)();
    io.to(message.ticketId.toString()).emit("appMessage", {
        action: "update",
        message
    });
    return res.send();
};
exports.remove = remove;
const sendQuickAnswer = async (req, res) => {
    const { ticketId, quickAnswerId } = req.params;
    const { tenantId } = req.user;
    const { logger } = require("../utils/logger");
    const ticket = await (0, ShowTicketService_1.default)(ticketId, tenantId);
    if (ticket.status !== "open") {
        throw new AppError_1.default("ERR_TICKET_CLOSED", 400);
    }
    if (!ticket.whatsappId) {
        throw new AppError_1.default("ERR_TICKET_WRONG_WHATSAPP_ID", 400);
    }
    const quickAnswer = await (0, ShowQuickAnswerService_1.default)(quickAnswerId, tenantId);
    const qaType = quickAnswer.mediaType || "text";
    let parsedPayload = null;
    try {
        parsedPayload = quickAnswer.dataJson ? JSON.parse(quickAnswer.dataJson) : null;
    }
    catch (error) {
        logger.warn(`[MessageController] Invalid quick answer dataJson quickAnswerId=${quickAnswer.id}`);
    }
    logger.info(`[MessageController] sendQuickAnswer quickAnswerId=${quickAnswer.id} ticketId=${ticket.id} type=${qaType}`);
    if (qaType === "text") {
        await (0, SendWhatsAppMessage_1.default)({ body: quickAnswer.message, ticket });
        return res.status(200).json({ ok: true, type: qaType });
    }
    if (qaType === "buttons" || qaType === "list") {
        await (0, SendWhatsAppInteractive_1.default)({
            body: quickAnswer.message,
            ticket,
            buttons: qaType === "buttons" ? parsedPayload?.buttons : undefined,
            list: qaType === "list" ? parsedPayload?.list : undefined
        });
        return res.status(200).json({ ok: true, type: qaType });
    }
    if (qaType === "carousel") {
        await (0, SendWhatsAppCarousel_1.default)({
            ticket,
            body: quickAnswer.message,
            cards: parsedPayload?.cards || []
        });
        return res.status(200).json({ ok: true, type: qaType });
    }
    logger.warn(`[MessageController] Invalid quick answer type fallback to text quickAnswerId=${quickAnswer.id}`);
    await (0, SendWhatsAppMessage_1.default)({ body: quickAnswer.message, ticket });
    return res.status(200).json({ ok: true, type: "text-fallback" });
};
exports.sendQuickAnswer = sendQuickAnswer;
const upsertReaction = async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const { id: userId, tenantId } = req.user;
    const message = await (0, UpdateMessageReactionService_1.default)({
        messageId,
        userId,
        tenantId,
        emoji
    });
    const io = (0, socket_1.getIO)();
    io.to(message.ticketId.toString()).emit("appMessage", {
        action: "update",
        message
    });
    return res.status(200).json(message);
};
exports.upsertReaction = upsertReaction;
