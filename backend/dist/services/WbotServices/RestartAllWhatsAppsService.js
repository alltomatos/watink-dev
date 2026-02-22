"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const StartWhatsAppSession_1 = require("./StartWhatsAppSession");
const RestartAllWhatsAppsService = async (companyId) => {
    const whatsapps = await Whatsapp_1.default.findAll({
        where: {
            tenantId: companyId
        }
    });
    await Promise.all(whatsapps.map(async (whatsapp) => {
        await (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, false, undefined, true);
    }));
};
exports.default = RestartAllWhatsAppsService;
