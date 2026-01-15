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
exports.store = void 0;
// import ImportContactsService from "../services/WbotServices/ImportContactsService";
const uuid_1 = require("uuid");
const RabbitMQService_1 = __importDefault(require("../services/RabbitMQService"));
const GetDefaultWhatsApp_1 = __importDefault(require("../helpers/GetDefaultWhatsApp"));
const logger_1 = require("../utils/logger");
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.user.id);
    // await ImportContactsService(userId);
    // New Async Logic
    try {
        const whatsapp = yield (0, GetDefaultWhatsApp_1.default)(userId);
        const tenantId = whatsapp.tenantId;
        yield RabbitMQService_1.default.publishCommand(`wbot.${tenantId}.${whatsapp.id}.contact.import`, {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            tenantId,
            type: "contact.import", // Need to ensure Engine handles this or create new type
            payload: {
                sessionId: whatsapp.id
            }
        });
        logger_1.logger.info(`[ImportContacts] Command sent for user ${userId} / session ${whatsapp.id}`);
        return res.status(200).json({ message: "Contact import scheduled. This may take a while." });
    }
    catch (err) {
        logger_1.logger.error(`[ImportContacts] Error: ${err}`);
        // Fallback if no default whatsapp
        return res.status(400).json({ error: "Could not schedule import. Ensure you have a connected WhatsApp." });
    }
});
exports.store = store;
