"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Protocol_1 = __importDefault(require("../../models/Protocol"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const User_1 = __importDefault(require("../../models/User"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const ListProtocolsService = async ({ tenantId, searchParam = "", pageNumber = "1", status, priority, contactId, ticketId }) => {
    const limit = 20;
    const offset = limit * (Number(pageNumber) - 1);
    const whereCondition = {
        tenantId
    };
    if (searchParam) {
        whereCondition[sequelize_1.Op.or] = [
            { protocolNumber: { [sequelize_1.Op.iLike]: `%${searchParam}%` } },
            { subject: { [sequelize_1.Op.iLike]: `%${searchParam}%` } }
        ];
    }
    if (status) {
        whereCondition.status = status;
    }
    if (priority) {
        whereCondition.priority = priority;
    }
    if (contactId) {
        whereCondition.contactId = contactId;
    }
    if (ticketId) {
        whereCondition.ticketId = ticketId;
    }
    const { count, rows: protocols } = await Protocol_1.default.findAndCountAll({
        where: whereCondition,
        include: [
            { model: Contact_1.default, as: "contact" },
            { model: User_1.default, as: "user" },
            { model: Ticket_1.default, as: "ticket" }
        ],
        limit,
        offset,
        order: [["createdAt", "DESC"]]
    });
    const hasMore = count > offset + protocols.length;
    return {
        protocols,
        count,
        hasMore
    };
};
exports.default = ListProtocolsService;
