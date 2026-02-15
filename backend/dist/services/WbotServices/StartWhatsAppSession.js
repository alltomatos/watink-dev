"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartWhatsAppSession = void 0;
const uuid_1 = require("uuid");
const socket_1 = require("../../libs/socket");
const logger_1 = require("../../utils/logger");
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const RedisService_1 = require("../RedisService");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const StartWhatsAppSession = async (whatsapp, usePairingCode, phoneNumber, force // New param
) => {
    // REDIS LOCK IMPLEMENTATION
    const redis = RedisService_1.RedisService.getInstance();
    const lockKey = `session:start:${whatsapp.id}`;
    const lockValue = (0, uuid_1.v4)();
    // Try to acquire lock for 10 seconds to prevent double-starts from UI Spam
    const acquired = await redis.setNx(lockKey, lockValue, 10);
    if (!acquired) {
        logger_1.logger.warn(`StartWhatsAppSession: Blocked double start attempt for session ${whatsapp.id}`);
        throw new AppError_1.default("ERR_SESSION_STARTING_ALREADY", 400);
    }
    try {
        await whatsapp.update({ status: "OPENING" });
        logger_1.logger.info(`StartWhatsAppSession called for session ${whatsapp.id}`);
        const io = (0, socket_1.getIO)();
        io.emit("whatsappSession", {
            action: "update",
            session: whatsapp
        });
        const command = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            tenantId: whatsapp.tenantId,
            type: "session.start",
            payload: {
                sessionId: whatsapp.id, // Reverting to stable ID for persistence
                usePairingCode,
                phoneNumber,
                name: whatsapp.name,
                syncHistory: whatsapp.syncHistory,
                syncPeriod: whatsapp.syncPeriod,
                keepAlive: whatsapp.keepAlive,
                force // Pass force flag
            }
        };
        await RabbitMQService_1.default.publishCommand(`wbot.${whatsapp.tenantId}.${whatsapp.id}.session.start`, command);
        logger_1.logger.info(`Session start command published for session ${whatsapp.id}`);
    }
    catch (err) {
        // Release lock on error
        await redis.delValue(lockKey);
        logger_1.logger.error(err);
        // Re-throw if needed, or let controller handle it.
        // Since this function is void and async, throwing here might be caught by Controller.
        throw err;
    }
    // Note: We do NOT release the lock immediately on success, we let it expire (TTL 10s)
    // to act as a debounce buffer for the "Start" button.
};
exports.StartWhatsAppSession = StartWhatsAppSession;
