"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFromContact = exports.update = exports.show = exports.store = exports.index = exports.dashboard = void 0;
const CreateProtocolService_1 = __importDefault(require("../services/ProtocolServices/CreateProtocolService"));
const ListProtocolsService_1 = __importDefault(require("../services/ProtocolServices/ListProtocolsService"));
const ShowProtocolService_1 = __importDefault(require("../services/ProtocolServices/ShowProtocolService"));
const UpdateProtocolService_1 = __importDefault(require("../services/ProtocolServices/UpdateProtocolService"));
const GetProtocolDashboardService_1 = __importDefault(require("../services/ProtocolServices/GetProtocolDashboardService"));
const dashboard = async (req, res) => {
    const { tenantId } = req.user;
    const dashboardData = await (0, GetProtocolDashboardService_1.default)(tenantId);
    return res.json(dashboardData);
};
exports.dashboard = dashboard;
const index = async (req, res) => {
    const { tenantId: tenantId, id: userId } = req.user;
    const { searchParam, pageNumber, status, priority, contactId, ticketId } = req.query;
    const { protocols, count, hasMore } = await (0, ListProtocolsService_1.default)({
        tenantId,
        searchParam: searchParam,
        pageNumber: pageNumber,
        status: status,
        priority: priority,
        contactId: contactId ? Number(contactId) : undefined,
        ticketId: ticketId ? Number(ticketId) : undefined
    });
    return res.json({ protocols, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { tenantId: tenantId, id: userId } = req.user;
    const protocolData = req.body;
    const protocol = await (0, CreateProtocolService_1.default)({
        ...protocolData,
        tenantId
    }, Number(userId));
    return res.status(201).json(protocol);
};
exports.store = store;
const show = async (req, res) => {
    const { tenantId: tenantId } = req.user;
    const { protocolId } = req.params;
    const protocol = await (0, ShowProtocolService_1.default)(Number(protocolId), tenantId);
    return res.json(protocol);
};
exports.show = show;
const update = async (req, res) => {
    const { tenantId: tenantId, id: userId } = req.user;
    const { protocolId } = req.params;
    const protocolData = req.body;
    const files = req.files;
    const protocol = await (0, UpdateProtocolService_1.default)({
        ...protocolData,
        id: Number(protocolId),
        tenantId,
        files
    }, Number(userId));
    return res.json(protocol);
};
exports.update = update;
// Endpoint para criar protocolo diretamente de um contato (usado pelo botão no drawer)
const createFromContact = async (req, res) => {
    const { tenantId: tenantId, id: userId } = req.user;
    const { contactId } = req.params;
    const { subject, description, priority, ticketId } = req.body;
    const protocol = await (0, CreateProtocolService_1.default)({
        tenantId,
        contactId: Number(contactId),
        ticketId: ticketId ? Number(ticketId) : undefined,
        subject: subject || "Novo Protocolo de Atendimento",
        description,
        priority,
        carouselCards: req.body.carouselCards
    }, Number(userId));
    return res.status(201).json(protocol);
};
exports.createFromContact = createFromContact;
