"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const socket_1 = require("../../libs/socket");
const logger_1 = require("../../utils/logger");
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
/**
 * Gracefully restarts a WhatsApp session WITHOUT clearing auth files.
 * This allows reconnecting without requiring a new QR code scan.
 */
const RestartWhatsAppSession = async (whatsapp) => {
    await whatsapp.update({ status: "OPENING" });
    logger_1.logger.info(`RestartWhatsAppSession called for session ${whatsapp.id}`);
    const io = (0, socket_1.getIO)();
    io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
    });
    try {
        const command = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            tenantId: whatsapp.tenantId,
            type: "session.restart",
            payload: {
                sessionId: whatsapp.id,
                name: whatsapp.name,
                syncHistory: whatsapp.syncHistory,
                syncPeriod: whatsapp.syncPeriod,
                keepAlive: whatsapp.keepAlive
            }
        };
        await RabbitMQService_1.default.publishCommand(`wbot.${whatsapp.tenantId}.${whatsapp.id}.session.restart`, command);
        logger_1.logger.info(`Session restart command published for session ${whatsapp.id}`);
    }
    catch (err) {
        logger_1.logger.error(err);
    }
};
exports.default = RestartWhatsAppSession;
