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
const AppError_1 = __importDefault(require("../../errors/AppError"));
const CheckContactOpenTickets_1 = __importDefault(require("../../helpers/CheckContactOpenTickets"));
const GetDefaultWhatsApp_1 = __importDefault(require("../../helpers/GetDefaultWhatsApp"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const User_1 = __importDefault(require("../../models/User"));
const ShowContactService_1 = __importDefault(require("../ContactServices/ShowContactService"));
const CreateTicketService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ contactId, status, userId, queueId }) {
    const defaultWhatsapp = yield (0, GetDefaultWhatsApp_1.default)(userId);
    yield (0, CheckContactOpenTickets_1.default)(contactId, defaultWhatsapp.id);
    const { isGroup, tenantId } = yield (0, ShowContactService_1.default)(contactId);
    if (queueId === undefined) {
        const user = yield User_1.default.findByPk(userId, { include: ["queues"] });
        queueId = (user === null || user === void 0 ? void 0 : user.queues.length) === 1 ? user.queues[0].id : undefined;
    }
    // Use Model.create instead of deprecated wbot.$create injection
    const ticket = yield Ticket_1.default.create({
        contactId,
        status,
        isGroup,
        userId,
        queueId,
        whatsappId: defaultWhatsapp.id,
        tenantId: tenantId || defaultWhatsapp.tenantId
    });
    yield ticket.reload({
        include: ["contact", "user", "queue", "whatsapp"]
    });
    if (!ticket) {
        throw new AppError_1.default("ERR_CREATING_TICKET");
    }
    return ticket;
});
exports.default = CreateTicketService;
