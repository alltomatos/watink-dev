"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../errors/AppError"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const GetDefaultWhatsAppByUser_1 = __importDefault(require("./GetDefaultWhatsAppByUser"));
const GetDefaultWhatsApp = async (userId) => {
    const ctx = require("./context").default.getStore();
    const effectiveTenantId = ctx?.tenantId;
    if (userId) {
        const whatsappByUser = await (0, GetDefaultWhatsAppByUser_1.default)(userId);
        if (whatsappByUser !== null) {
            return whatsappByUser;
        }
    }
    const where = { isDefault: true };
    if (effectiveTenantId)
        where.tenantId = effectiveTenantId;
    const defaultWhatsapp = await Whatsapp_1.default.findOne({
        where
    });
    if (!defaultWhatsapp) {
        // If no default for tenant, try absolute default (optional) or fail
        throw new AppError_1.default("ERR_NO_DEF_WAPP_FOUND");
    }
    return defaultWhatsapp;
};
exports.default = GetDefaultWhatsApp;
