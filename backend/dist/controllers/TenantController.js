"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const CreateTenantService_1 = __importDefault(require("../services/TenantServices/CreateTenantService"));
const ListTenantsService_1 = __importDefault(require("../services/TenantServices/ListTenantsService"));
const ShowTenantService_1 = __importDefault(require("../services/TenantServices/ShowTenantService"));
const UpdateTenantService_1 = __importDefault(require("../services/TenantServices/UpdateTenantService"));
const DeleteTenantService_1 = __importDefault(require("../services/TenantServices/DeleteTenantService"));
const index = async (req, res) => {
    const tenants = await (0, ListTenantsService_1.default)();
    return res.status(200).json(tenants);
};
exports.index = index;
const store = async (req, res) => {
    const { name, status, ownerId } = req.body;
    const tenant = await (0, CreateTenantService_1.default)({
        name,
        status,
        ownerId
    });
    return res.status(200).json(tenant);
};
exports.store = store;
const show = async (req, res) => {
    const { tenantId } = req.params;
    const tenant = await (0, ShowTenantService_1.default)(tenantId);
    return res.status(200).json(tenant);
};
exports.show = show;
const update = async (req, res) => {
    const { tenantId } = req.params;
    const tenantData = req.body;
    const tenant = await (0, UpdateTenantService_1.default)({ tenantData, tenantId });
    return res.status(200).json(tenant);
};
exports.update = update;
const remove = async (req, res) => {
    const { tenantId } = req.params;
    await (0, DeleteTenantService_1.default)(tenantId);
    return res.status(200).json({ message: "Tenant deleted" });
};
exports.remove = remove;
