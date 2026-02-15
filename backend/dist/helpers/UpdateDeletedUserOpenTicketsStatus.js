"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UpdateTicketService_1 = __importDefault(require("../services/TicketServices/UpdateTicketService"));
const UpdateDeletedUserOpenTicketsStatus = async (tickets) => {
    tickets.forEach(async (t) => {
        const ticketId = t.id.toString();
        await (0, UpdateTicketService_1.default)({
            ticketData: { status: "pending" },
            ticketId
        });
    });
};
exports.default = UpdateDeletedUserOpenTicketsStatus;
