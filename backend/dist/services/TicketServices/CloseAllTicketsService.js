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
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const UpdateTicketService_1 = __importDefault(require("./UpdateTicketService"));
const logger_1 = require("../../utils/logger");
const sequelize_1 = require("sequelize");
const CloseAllTicketsService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ tenantId, userId, statusOpen = true, statusPending = true, includeGroups = false }) {
    const statusFilter = [];
    if (statusOpen)
        statusFilter.push("open");
    if (statusPending)
        statusFilter.push("pending");
    // Se nenhum status for selecionado, não faz nada
    if (statusFilter.length === 0)
        return 0;
    const whereCondition = {
        tenantId,
        status: {
            [sequelize_1.Op.in]: statusFilter
        }
    };
    if (!includeGroups) {
        whereCondition.isGroup = false;
    }
    const tickets = yield Ticket_1.default.findAll({
        where: whereCondition
    });
    let closedCount = 0;
    for (const ticket of tickets) {
        try {
            yield (0, UpdateTicketService_1.default)({
                ticketData: {
                    status: "closed",
                    userId
                },
                ticketId: ticket.id
            });
            closedCount++;
        }
        catch (error) {
            logger_1.logger.error(`Error closing ticket ${ticket.id} in CloseAllTicketsService:`, error);
        }
    }
    return closedCount;
});
exports.default = CloseAllTicketsService;
