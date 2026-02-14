"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const logger_1 = require("../../utils/logger");
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const socket_1 = require("../../libs/socket");
const StopWhatsAppSession = async (whatsappId) => {
    try {
        const whatsapp = await Whatsapp_1.default.findByPk(whatsappId);
        if (whatsapp) {
            await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
            const io = (0, socket_1.getIO)();
            io.emit("whatsappSession", {
                action: "update",
                session: whatsapp
            });
            // SKIP IF WEBCHAT - No need to tell Engine Standard
            if (whatsapp.type === "webchat") {
                logger_1.logger.info(`StopWhatsAppSession: Skipping engine command for Webchat session ${whatsappId}`);
                return;
            }
        }
        const envelope = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            tenantId: whatsapp?.tenantId || 1,
            type: "session.stop",
            payload: {
                sessionId: whatsappId
            }
        };
        // Use the routing key pattern wbot.tenant.{tenantId}.{engine}.{sessionId}.{type}
        await RabbitMQService_1.default.publishCommand(RabbitMQService_1.default.generateRoutingKey(whatsapp?.tenantId || 1, whatsapp?.engineType || "whaileys", whatsappId, "session.stop"), envelope);
        logger_1.logger.info(`Session stop command published for WhatsApp ID ${whatsappId}`);
    }
    catch (err) {
        logger_1.logger.error("Error publishing session.stop command", err);
    }
};
exports.default = StopWhatsAppSession;
