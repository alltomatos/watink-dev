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
exports.createFromContact = exports.update = exports.show = exports.store = exports.index = exports.dashboard = void 0;
const CreateProtocolService_1 = __importDefault(require("../services/ProtocolServices/CreateProtocolService"));
const ListProtocolsService_1 = __importDefault(require("../services/ProtocolServices/ListProtocolsService"));
const ShowProtocolService_1 = __importDefault(require("../services/ProtocolServices/ShowProtocolService"));
const UpdateProtocolService_1 = __importDefault(require("../services/ProtocolServices/UpdateProtocolService"));
const GetProtocolDashboardService_1 = __importDefault(require("../services/ProtocolServices/GetProtocolDashboardService"));
const dashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const dashboardData = yield (0, GetProtocolDashboardService_1.default)(tenantId);
    return res.json(dashboardData);
});
exports.dashboard = dashboard;
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId: tenantId, id: userId } = req.user;
    const { searchParam, pageNumber, status, priority, contactId, ticketId } = req.query;
    const { protocols, count, hasMore } = yield (0, ListProtocolsService_1.default)({
        tenantId,
        searchParam: searchParam,
        pageNumber: pageNumber,
        status: status,
        priority: priority,
        contactId: contactId ? Number(contactId) : undefined,
        ticketId: ticketId ? Number(ticketId) : undefined
    });
    return res.json({ protocols, count, hasMore });
});
exports.index = index;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId: tenantId, id: userId } = req.user;
    const protocolData = req.body;
    const protocol = yield (0, CreateProtocolService_1.default)(Object.assign(Object.assign({}, protocolData), { tenantId }), Number(userId));
    return res.status(201).json(protocol);
});
exports.store = store;
const show = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId: tenantId } = req.user;
    const { protocolId } = req.params;
    const protocol = yield (0, ShowProtocolService_1.default)(Number(protocolId), tenantId);
    return res.json(protocol);
});
exports.show = show;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId: tenantId, id: userId } = req.user;
    const { protocolId } = req.params;
    const protocolData = req.body;
    const files = req.files;
    const protocol = yield (0, UpdateProtocolService_1.default)(Object.assign(Object.assign({}, protocolData), { id: Number(protocolId), tenantId,
        files }), Number(userId));
    return res.json(protocol);
});
exports.update = update;
// Endpoint para criar protocolo diretamente de um contato (usado pelo botão no drawer)
const createFromContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId: tenantId, id: userId } = req.user;
    const { contactId } = req.params;
    const { subject, description, priority, ticketId } = req.body;
    const protocol = yield (0, CreateProtocolService_1.default)({
        tenantId,
        contactId: Number(contactId),
        ticketId: ticketId ? Number(ticketId) : undefined,
        subject: subject || "Novo Protocolo de Atendimento",
        description,
        priority,
        carouselCards: req.body.carouselCards
    }, Number(userId));
    return res.status(201).json(protocol);
});
exports.createFromContact = createFromContact;
