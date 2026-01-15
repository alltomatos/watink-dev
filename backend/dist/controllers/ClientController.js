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
exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const CreateClientService_1 = __importDefault(require("../services/ClientServices/CreateClientService"));
const ListClientsService_1 = __importDefault(require("../services/ClientServices/ListClientsService"));
const ShowClientService_1 = __importDefault(require("../services/ClientServices/ShowClientService"));
const UpdateClientService_1 = __importDefault(require("../services/ClientServices/UpdateClientService"));
const DeleteClientService_1 = __importDefault(require("../services/ClientServices/DeleteClientService"));
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId: tenantId } = req.user;
    const { searchParam, pageNumber, isActive } = req.query;
    const { clients, count, hasMore } = yield (0, ListClientsService_1.default)({
        tenantId: tenantId,
        searchParam: searchParam,
        pageNumber: pageNumber,
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined
    });
    return res.json({ clients, count, hasMore });
});
exports.index = index;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId: tenantId } = req.user;
    const clientData = req.body;
    const client = yield (0, CreateClientService_1.default)(Object.assign(Object.assign({}, clientData), { tenantId: tenantId }));
    return res.status(201).json(client);
});
exports.store = store;
const show = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId: tenantId } = req.user;
    const { clientId } = req.params;
    const client = yield (0, ShowClientService_1.default)(Number(clientId), tenantId);
    return res.json(client);
});
exports.show = show;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId: tenantId } = req.user;
    const { clientId } = req.params;
    const clientData = req.body;
    const client = yield (0, UpdateClientService_1.default)(Object.assign(Object.assign({}, clientData), { id: Number(clientId), tenantId: tenantId }));
    return res.json(client);
});
exports.update = update;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId: tenantId } = req.user;
    const { clientId } = req.params;
    yield (0, DeleteClientService_1.default)(Number(clientId), tenantId);
    return res.status(200).json({ message: "Client deleted" });
});
exports.remove = remove;
