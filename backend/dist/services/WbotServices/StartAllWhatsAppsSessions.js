"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartAllWhatsAppsSessions = void 0;
const ListWhatsAppsService_1 = __importDefault(require("../WhatsappService/ListWhatsAppsService"));
const StartWhatsAppSession_1 = require("./StartWhatsAppSession");
const logger_1 = require("../../utils/logger");
const StartAllWhatsAppsSessions = async () => {
    const whatsapps = await (0, ListWhatsAppsService_1.default)();
    if (whatsapps.length === 0)
        return;
    const results = await Promise.allSettled(whatsapps.map((whatsapp) => (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp)));
    results.forEach((result, idx) => {
        if (result.status === "rejected") {
            logger_1.logger.warn(`StartAllWhatsAppsSessions: failed to start session ${whatsapps[idx]?.id}: ${result.reason?.message || result.reason}`);
        }
    });
};
exports.StartAllWhatsAppsSessions = StartAllWhatsAppsSessions;
