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
exports.StartWhatsAppSession = void 0;
const uuid_1 = require("uuid");
const socket_1 = require("../../libs/socket");
const logger_1 = require("../../utils/logger");
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const RedisService_1 = require("../RedisService");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const StartWhatsAppSession = (whatsapp, usePairingCode, phoneNumber, force // New param
) => __awaiter(void 0, void 0, void 0, function* () {
    // REDIS LOCK IMPLEMENTATION
    const redis = RedisService_1.RedisService.getInstance();
    const lockKey = `session:start:${whatsapp.id}`;
    const lockValue = (0, uuid_1.v4)();
    // Try to acquire lock for 10 seconds to prevent double-starts from UI Spam
    const acquired = yield redis.setNx(lockKey, lockValue, 10);
    if (!acquired) {
        logger_1.logger.warn(`StartWhatsAppSession: Blocked double start attempt for session ${whatsapp.id}`);
        throw new AppError_1.default("ERR_SESSION_STARTING_ALREADY", 400);
    }
    try {
        yield whatsapp.update({ status: "OPENING" });
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
        yield RabbitMQService_1.default.publishCommand(`wbot.${whatsapp.tenantId}.${whatsapp.id}.session.start`, command);
        logger_1.logger.info(`Session start command published for session ${whatsapp.id}`);
    }
    catch (err) {
        // Release lock on error
        yield redis.delValue(lockKey);
        logger_1.logger.error(err);
        // Re-throw if needed, or let controller handle it.
        // Since this function is void and async, throwing here might be caught by Controller.
        throw err;
    }
    // Note: We do NOT release the lock immediately on success, we let it expire (TTL 10s)
    // to act as a debounce buffer for the "Start" button.
});
exports.StartWhatsAppSession = StartWhatsAppSession;
