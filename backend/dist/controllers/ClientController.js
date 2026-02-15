"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const CreateClientService_1 = __importDefault(require("../services/ClientServices/CreateClientService"));
const ListClientsService_1 = __importDefault(require("../services/ClientServices/ListClientsService"));
const ShowClientService_1 = __importDefault(require("../services/ClientServices/ShowClientService"));
const UpdateClientService_1 = __importDefault(require("../services/ClientServices/UpdateClientService"));
const DeleteClientService_1 = __importDefault(require("../services/ClientServices/DeleteClientService"));
const index = async (req, res) => {
    const { tenantId: tenantId } = req.user;
    const { searchParam, pageNumber, isActive } = req.query;
    const { clients, count, hasMore } = await (0, ListClientsService_1.default)({
        tenantId: tenantId,
        searchParam: searchParam,
        pageNumber: pageNumber,
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined
    });
    return res.json({ clients, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { tenantId: tenantId } = req.user;
    const clientData = req.body;
    const client = await (0, CreateClientService_1.default)({
        ...clientData,
        tenantId: tenantId
    });
    return res.status(201).json(client);
};
exports.store = store;
const show = async (req, res) => {
    const { tenantId: tenantId } = req.user;
    const { clientId } = req.params;
    const client = await (0, ShowClientService_1.default)(Number(clientId), tenantId);
    return res.json(client);
};
exports.show = show;
const update = async (req, res) => {
    const { tenantId: tenantId } = req.user;
    const { clientId } = req.params;
    const clientData = req.body;
    const client = await (0, UpdateClientService_1.default)({
        ...clientData,
        id: Number(clientId),
        tenantId: tenantId
    });
    return res.json(client);
};
exports.update = update;
const remove = async (req, res) => {
    const { tenantId: tenantId } = req.user;
    const { clientId } = req.params;
    await (0, DeleteClientService_1.default)(Number(clientId), tenantId);
    return res.status(200).json({ message: "Client deleted" });
};
exports.remove = remove;
