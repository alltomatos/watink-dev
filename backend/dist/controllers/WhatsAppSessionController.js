"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ShowWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppService"));
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const UpdateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppService"));
const StopWhatsAppSession_1 = __importDefault(require("../services/WbotServices/StopWhatsAppSession"));
const RestartAllWhatsAppsService_1 = __importDefault(require("../services/WbotServices/RestartAllWhatsAppsService"));
const store = async (req, res) => {
    const { whatsappId } = req.params;
    const { usePairingCode, phoneNumber } = req.body;
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId);
    // Always force restart on manual start request to clear stuck sessions
    const force = true;
    await (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, usePairingCode, phoneNumber, force);
    return res.status(200).json({ message: "Starting session." });
};
const update = async (req, res) => {
    const { whatsappId } = req.params;
    const { usePairingCode, phoneNumber } = req.body;
    const { whatsapp } = await (0, UpdateWhatsAppService_1.default)({
        whatsappId,
        whatsappData: { session: "" }
    });
    // For update/reconnect, we generally force
    const force = true;
    await (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, usePairingCode, phoneNumber, force);
    return res.status(200).json({ message: "Starting session." });
};
const remove = async (req, res) => {
    const { whatsappId } = req.params;
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId);
    await (0, StopWhatsAppSession_1.default)(whatsapp.id);
    return res.status(200).json({ message: "Session disconnected." });
};
const restartAll = async (req, res) => {
    const { tenantId } = req.user;
    await (0, RestartAllWhatsAppsService_1.default)(tenantId);
    return res.status(200).json({ message: "Restarting all sessions." });
};
exports.default = { store, remove, update, restartAll };
