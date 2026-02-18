"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Tenant_1 = __importDefault(require("../../models/Tenant"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const DeleteTenantService = async (id) => {
    const tenant = await Tenant_1.default.findOne({
        where: { id }
    });
    if (!tenant) {
        throw new AppError_1.default("ERR_NO_TENANT_FOUND", 404);
    }
    await tenant.destroy();
};
exports.default = DeleteTenantService;
