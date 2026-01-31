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
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const UpdateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppService"));
const StopWhatsAppSession_1 = __importDefault(require("../services/WbotServices/StopWhatsAppSession"));
const RestartAllWhatsAppsService_1 = __importDefault(require("../services/WbotServices/RestartAllWhatsAppsService"));
const logger_1 = require("../utils/logger");
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { whatsappId } = req.params;
    const { usePairingCode, phoneNumber } = req.body;
    try {
        console.log(`[DEBUG] WhatsAppSessionController.store called for whatsappId: ${whatsappId}`);
        const whatsapp = yield Whatsapp_1.default.findByPk(whatsappId);
        if (!whatsapp) {
            throw new AppError_1.default("ERR_NO_WAPP_FOUND", 404);
        }
        const force = true;
        yield (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, usePairingCode, phoneNumber, force);
    }
    catch (err) {
        const message = err.message || "Unknown error";
        console.error(`[DEBUG] CRITICAL ERROR in WhatsAppSessionController:`, err);
        logger_1.logger.error(`Error starting WhatsApp session: ${message}`, err);
        throw err;
    }
    return res.status(200).json({ message: "Starting session." });
});
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { whatsappId } = req.params;
    const { usePairingCode, phoneNumber } = req.body;
    try {
        const { whatsapp } = yield (0, UpdateWhatsAppService_1.default)({
            whatsappId,
            whatsappData: { session: "" }
        });
        const force = true;
        yield (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, usePairingCode, phoneNumber, force);
    }
    catch (err) {
        logger_1.logger.error(`Error updating/starting WhatsApp session: ${err.message}`, err);
        throw err;
    }
    return res.status(200).json({ message: "Starting session." });
});
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { whatsappId } = req.params;
    const whatsapp = yield Whatsapp_1.default.findByPk(whatsappId);
    if (!whatsapp) {
        throw new AppError_1.default("ERR_NO_WAPP_FOUND", 404);
    }
    yield (0, StopWhatsAppSession_1.default)(whatsapp.id);
    return res.status(200).json({ message: "Session disconnected." });
});
const restartAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    yield (0, RestartAllWhatsAppsService_1.default)(tenantId);
    return res.status(200).json({ message: "Restarting all sessions." });
});
exports.default = { store, remove, update, restartAll };
