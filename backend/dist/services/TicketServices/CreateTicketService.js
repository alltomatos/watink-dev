"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const CheckContactOpenTickets_1 = __importDefault(require("../../helpers/CheckContactOpenTickets"));
const GetDefaultWhatsApp_1 = __importDefault(require("../../helpers/GetDefaultWhatsApp"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const User_1 = __importDefault(require("../../models/User"));
const ShowContactService_1 = __importDefault(require("../ContactServices/ShowContactService"));
const CreateTicketService = async ({ contactId, status, userId, queueId }) => {
    const defaultWhatsapp = await (0, GetDefaultWhatsApp_1.default)(userId);
    await (0, CheckContactOpenTickets_1.default)(contactId, defaultWhatsapp.id);
    const { isGroup, tenantId } = await (0, ShowContactService_1.default)(contactId);
    if (queueId === undefined) {
        const user = await User_1.default.findByPk(userId, { include: ["queues"] });
        queueId = user?.queues.length === 1 ? user.queues[0].id : undefined;
    }
    // Use Model.create instead of deprecated wbot.$create injection
    const ticket = await Ticket_1.default.create({
        contactId,
        status,
        isGroup,
        userId,
        queueId,
        whatsappId: defaultWhatsapp.id,
        tenantId: tenantId || defaultWhatsapp.tenantId
    });
    await ticket.reload({
        include: ["contact", "user", "queue", "whatsapp"]
    });
    if (!ticket) {
        throw new AppError_1.default("ERR_CREATING_TICKET");
    }
    return ticket;
};
exports.default = CreateTicketService;
