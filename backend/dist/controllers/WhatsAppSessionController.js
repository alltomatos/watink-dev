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
const ShowWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppService"));
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const UpdateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppService"));
const StopWhatsAppSession_1 = __importDefault(require("../services/WbotServices/StopWhatsAppSession"));
const RestartAllWhatsAppsService_1 = __importDefault(require("../services/WbotServices/RestartAllWhatsAppsService"));
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { whatsappId } = req.params;
    const { usePairingCode, phoneNumber } = req.body;
    const whatsapp = yield (0, ShowWhatsAppService_1.default)(whatsappId);
    // Always force restart on manual start request to clear stuck sessions
    const force = true;
    yield (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, usePairingCode, phoneNumber, force);
    return res.status(200).json({ message: "Starting session." });
});
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { whatsappId } = req.params;
    const { usePairingCode, phoneNumber } = req.body;
    const { whatsapp } = yield (0, UpdateWhatsAppService_1.default)({
        whatsappId,
        whatsappData: { session: "" }
    });
    // For update/reconnect, we generally force
    const force = true;
    yield (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, usePairingCode, phoneNumber, force);
    return res.status(200).json({ message: "Starting session." });
});
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { whatsappId } = req.params;
    const whatsapp = yield (0, ShowWhatsAppService_1.default)(whatsappId);
    yield (0, StopWhatsAppSession_1.default)(whatsapp.id);
    return res.status(200).json({ message: "Session disconnected." });
});
const restartAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    yield (0, RestartAllWhatsAppsService_1.default)(tenantId);
    return res.status(200).json({ message: "Restarting all sessions." });
});
exports.default = { store, remove, update, restartAll };
