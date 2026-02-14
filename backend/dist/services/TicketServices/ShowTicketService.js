"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const User_1 = __importDefault(require("../../models/User"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const Tag_1 = __importDefault(require("../../models/Tag"));
const ShowTicketService = async (id, tenantId) => {
    const ctx = require("../../libs/context").default.getStore();
    const effectiveTenantId = tenantId || ctx?.tenantId;
    const where = { id };
    if (effectiveTenantId)
        where.tenantId = effectiveTenantId;
    const ticket = await Ticket_1.default.findOne({
        where,
        include: [
            {
                model: Contact_1.default,
                as: "contact",
                attributes: ["id", "name", "number", "profilePicUrl", "isGroup"],
                include: ["extraInfo"]
            },
            {
                model: User_1.default,
                as: "user",
                attributes: ["id", "name"]
            },
            {
                model: Queue_1.default,
                as: "queue",
                attributes: ["id", "name", "color"]
            },
            {
                model: Whatsapp_1.default,
                as: "whatsapp",
                attributes: ["name"]
            },
            {
                model: Tag_1.default,
                as: "tags",
                attributes: ["id", "name", "color", "icon"]
            }
        ]
    });
    if (!ticket) {
        throw new AppError_1.default("ERR_NO_TICKET_FOUND", 404);
    }
    return ticket;
};
exports.default = ShowTicketService;
