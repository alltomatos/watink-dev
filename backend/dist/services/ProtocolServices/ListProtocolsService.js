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
const sequelize_1 = require("sequelize");
const Protocol_1 = __importDefault(require("../../models/Protocol"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const User_1 = __importDefault(require("../../models/User"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const ListProtocolsService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ tenantId, searchParam = "", pageNumber = "1", status, priority, contactId, ticketId }) {
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
    const { count, rows: protocols } = yield Protocol_1.default.findAndCountAll({
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
});
exports.default = ListProtocolsService;
