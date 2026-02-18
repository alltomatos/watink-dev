"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Message_1 = __importDefault(require("../../models/Message"));
const ShowTicketService_1 = __importDefault(require("../TicketServices/ShowTicketService"));
const ListMessagesService = async ({ pageNumber = "1", ticketId }) => {
    const ticket = await (0, ShowTicketService_1.default)(ticketId);
    if (!ticket) {
        throw new AppError_1.default("ERR_NO_TICKET_FOUND", 404);
    }
    // await setMessagesAsRead(ticket);
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: messages } = await Message_1.default.findAndCountAll({
        where: { ticketId },
        limit,
        include: [
            "contact",
            {
                model: Message_1.default,
                as: "quotedMsg",
                include: ["contact"]
            }
        ],
        offset,
        order: [["createdAt", "DESC"]]
    });
    const hasMore = count > offset + messages.length;
    return {
        messages: messages.reverse(),
        ticket,
        count,
        hasMore
    };
};
exports.default = ListMessagesService;
