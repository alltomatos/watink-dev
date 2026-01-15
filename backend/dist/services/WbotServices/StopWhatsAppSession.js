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
const uuid_1 = require("uuid");
const logger_1 = require("../../utils/logger");
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const socket_1 = require("../../libs/socket");
const StopWhatsAppSession = (whatsappId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const whatsapp = yield Whatsapp_1.default.findByPk(whatsappId);
        if (whatsapp) {
            yield whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
            const io = (0, socket_1.getIO)();
            io.emit("whatsappSession", {
                action: "update",
                session: whatsapp
            });
        }
        const envelope = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            tenantId: (whatsapp === null || whatsapp === void 0 ? void 0 : whatsapp.tenantId) || 1,
            type: "session.stop",
            payload: {
                sessionId: whatsappId
            }
        };
        // Use the routing key pattern wbot.tenantId.sessionId.command
        yield RabbitMQService_1.default.publishCommand(`wbot.${(whatsapp === null || whatsapp === void 0 ? void 0 : whatsapp.tenantId) || 1}.${whatsappId}.session.stop`, envelope);
        logger_1.logger.info(`Session stop command published for WhatsApp ID ${whatsappId}`);
    }
    catch (err) {
        logger_1.logger.error("Error publishing session.stop command", err);
    }
});
exports.default = StopWhatsAppSession;
