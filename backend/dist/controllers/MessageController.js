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
exports.remove = exports.store = exports.index = void 0;
const SetTicketMessagesAsRead_1 = __importDefault(require("../helpers/SetTicketMessagesAsRead"));
const socket_1 = require("../libs/socket");
const ListMessagesService_1 = __importDefault(require("../services/MessageServices/ListMessagesService"));
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const DeleteWhatsAppMessage_1 = __importDefault(require("../services/WbotServices/DeleteWhatsAppMessage"));
const SendWhatsAppMedia_1 = __importDefault(require("../services/WbotServices/SendWhatsAppMedia"));
const SendWhatsAppMessage_1 = __importDefault(require("../services/WbotServices/SendWhatsAppMessage"));
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const { pageNumber } = req.query;
    const { count, messages, ticket, hasMore } = yield (0, ListMessagesService_1.default)({
        pageNumber,
        ticketId
    });
    (0, SetTicketMessagesAsRead_1.default)(ticket);
    return res.json({ count, messages, ticket, hasMore });
});
exports.index = index;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const { body, quotedMsg, mentionedIds } = req.body;
    const medias = req.files;
    const { logger } = require("../utils/logger");
    logger.info(`[MessageController] Store requested for ticket ${ticketId}. Body: ${body}`);
    const ticket = yield (0, ShowTicketService_1.default)(ticketId);
    (0, SetTicketMessagesAsRead_1.default)(ticket);
    if (medias && medias.length > 0) {
        // req.body.body can be a string or an array of strings (if multiple bodies sent)
        // Multer/Express handles 'body' field. If multiple fields with same name 'body', it becomes an array.
        // If we appended 'body' for each media in the same order, we expect an array (or string if just 1).
        const bodies = Array.isArray(body) ? body : [body];
        yield Promise.all(medias.map((media, index) => __awaiter(void 0, void 0, void 0, function* () {
            const caption = bodies[index] !== undefined ? bodies[index] : (bodies[0] || "");
            yield (0, SendWhatsAppMedia_1.default)({ media, ticket, body: caption, mentionedIds });
        })));
    }
    else {
        yield (0, SendWhatsAppMessage_1.default)({ body, ticket, quotedMsg, mentionedIds });
    }
    return res.send();
});
exports.store = store;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { messageId } = req.params;
    const message = yield (0, DeleteWhatsAppMessage_1.default)(messageId);
    const io = (0, socket_1.getIO)();
    io.to(message.ticketId.toString()).emit("appMessage", {
        action: "update",
        message
    });
    return res.send();
});
exports.remove = remove;
