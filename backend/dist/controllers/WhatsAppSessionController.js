"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const UpdateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppService"));
const StopWhatsAppSession_1 = __importDefault(require("../services/WbotServices/StopWhatsAppSession"));
const RestartAllWhatsAppsService_1 = __importDefault(require("../services/WbotServices/RestartAllWhatsAppsService"));
const logger_1 = require("../utils/logger");
const store = async (req, res) => {
    const { whatsappId } = req.params;
    const { usePairingCode, phoneNumber, force } = req.body;
    try {
        console.log(`[DEBUG] WhatsAppSessionController.store called for whatsappId: ${whatsappId}`);
        const whatsapp = await Whatsapp_1.default.findByPk(whatsappId);
        if (!whatsapp) {
            throw new AppError_1.default("ERR_NO_WAPP_FOUND", 404);
        }
        // Default must be non-forced start to preserve Redis auth state during QR refresh loops.
        const shouldForce = force === true;
        await (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, usePairingCode, phoneNumber, shouldForce);
    }
    catch (err) {
        const message = err.message || "Unknown error";
        console.error(`[DEBUG] CRITICAL ERROR in WhatsAppSessionController:`, err);
        logger_1.logger.error(`Error starting WhatsApp session: ${message}`, err);
        throw err;
    }
    return res.status(200).json({ message: "Starting session." });
};
const update = async (req, res) => {
    const { whatsappId } = req.params;
    const { usePairingCode, phoneNumber } = req.body;
    try {
        const { whatsapp } = await (0, UpdateWhatsAppService_1.default)({
            whatsappId,
            whatsappData: { session: "" }
        });
        const force = true;
        await (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, usePairingCode, phoneNumber, force);
    }
    catch (err) {
        logger_1.logger.error(`Error updating/starting WhatsApp session: ${err.message}`, err);
        throw err;
    }
    return res.status(200).json({ message: "Starting session." });
};
const remove = async (req, res) => {
    const { whatsappId } = req.params;
    const whatsapp = await Whatsapp_1.default.findByPk(whatsappId);
    if (!whatsapp) {
        throw new AppError_1.default("ERR_NO_WAPP_FOUND", 404);
    }
    await (0, StopWhatsAppSession_1.default)(whatsapp.id);
    return res.status(200).json({ message: "Session disconnected." });
};
const restartAll = async (req, res) => {
    const { tenantId } = req.user;
    await (0, RestartAllWhatsAppsService_1.default)(tenantId);
    return res.status(200).json({ message: "Restarting all sessions." });
};
exports.default = { store, remove, update, restartAll };
