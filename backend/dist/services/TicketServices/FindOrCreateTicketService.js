"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const ShowTicketService_1 = __importDefault(require("./ShowTicketService"));
const FindOrCreateTicketService = async (contact, whatsappId, unreadMessages, tenantId, groupContact) => {
    // Buscar ticket aberto ou pendente existente
    let ticket = await Ticket_1.default.findOne({
        where: {
            status: {
                [sequelize_1.Op.or]: ["open", "pending"]
            },
            tenantId,
            contactId: groupContact ? groupContact.id : contact.id,
            whatsappId: whatsappId
        }
    });
    if (ticket) {
        await ticket.update({ unreadMessages });
        return await (0, ShowTicketService_1.default)(ticket.id);
    }
    // Lógica removida: Mensagens antigas agora são tratadas no EventListener
    // e não criam tickets - apenas salvam no histórico se ticket existir
    // Para grupos: reabrir como 'open' (grupos sempre prontos para resposta)
    if (!ticket && groupContact) {
        ticket = await Ticket_1.default.findOne({
            where: {
                contactId: groupContact.id,
                whatsappId: whatsappId,
                tenantId
            },
            order: [["updatedAt", "DESC"]]
        });
        if (ticket) {
            await ticket.update({
                status: "open", // Grupos sempre abertos
                unreadMessages
            });
        }
    }
    if (!ticket && !groupContact) {
        ticket = await Ticket_1.default.findOne({
            where: {
                updatedAt: {
                    [sequelize_1.Op.between]: [+(0, date_fns_1.subHours)(new Date(), 2), +new Date()]
                },
                contactId: contact.id,
                whatsappId: whatsappId,
                tenantId
            },
            order: [["updatedAt", "DESC"]]
        });
        if (ticket) {
            await ticket.update({
                status: "pending",
                userId: null,
                unreadMessages
            });
        }
    }
    if (!ticket) {
        // Grupos: criar como 'open' (sempre prontos para resposta)
        // Individuais: criar como 'pending' (aguardando aceite)
        const ticketStatus = groupContact ? "open" : "pending";
        ticket = await Ticket_1.default.create({
            contactId: groupContact ? groupContact.id : contact.id,
            status: ticketStatus,
            isGroup: !!groupContact,
            unreadMessages,
            whatsappId,
            tenantId
        });
    }
    ticket = await (0, ShowTicketService_1.default)(ticket.id);
    return ticket;
};
exports.default = FindOrCreateTicketService;
