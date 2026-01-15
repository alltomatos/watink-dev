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
exports.remove = exports.updateBusiness = exports.update = exports.show = exports.store = exports.index = void 0;
const CreateTenantService_1 = __importDefault(require("../services/TenantServices/CreateTenantService"));
const ListTenantsService_1 = __importDefault(require("../services/TenantServices/ListTenantsService"));
const ShowTenantService_1 = __importDefault(require("../services/TenantServices/ShowTenantService"));
const UpdateTenantService_1 = __importDefault(require("../services/TenantServices/UpdateTenantService"));
const DeleteTenantService_1 = __importDefault(require("../services/TenantServices/DeleteTenantService"));
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tenants = yield (0, ListTenantsService_1.default)();
    return res.status(200).json(tenants);
});
exports.index = index;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, status, ownerId } = req.body;
    const tenant = yield (0, CreateTenantService_1.default)({
        name,
        status,
        ownerId
    });
    return res.status(200).json(tenant);
});
exports.store = store;
const show = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.params;
    const tenant = yield (0, ShowTenantService_1.default)(tenantId);
    return res.status(200).json(tenant);
});
exports.show = show;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.params;
    const tenantData = req.body;
    const tenant = yield (0, UpdateTenantService_1.default)({ tenantData, tenantId });
    return res.status(200).json(tenant);
});
exports.update = update;
const updateBusiness = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.params;
    const { name, document, businessHours, message } = req.body;
    const tenantData = {
        name,
        document,
        businessHours,
        message
    };
    if (req.file) {
        tenantData.logo = req.file.filename;
    }
    const tenant = yield (0, UpdateTenantService_1.default)({ tenantData, tenantId });
    return res.status(200).json(tenant);
});
exports.updateBusiness = updateBusiness;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.params;
    yield (0, DeleteTenantService_1.default)(tenantId);
    return res.status(200).json({ message: "Tenant deleted" });
});
exports.remove = remove;
