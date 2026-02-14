"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartWhatsAppSession = void 0;
const uuid_1 = require("uuid");
const Plugin_1 = __importDefault(require("../../models/Plugin"));
const PluginInstallation_1 = __importDefault(require("../../models/PluginInstallation"));
const Setting_1 = __importDefault(require("../../models/Setting"));
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
        logger_1.logger.info(`StartWhatsAppSession called for session ${whatsapp.id} (Type: ${whatsapp.type})`);
        const io = (0, socket_1.getIO)();
        io.emit("whatsappSession", {
            action: "update",
            session: whatsapp
        });
        const sessionInstanceId = Date.now(); // Unique ID for this session instance
        // PAPI ENGINE PLUGIN CHECK
        let papiUrl;
        let papiKey;
        if (whatsapp.engineType === "papi") {
            logger_1.logger.info(`StartWhatsAppSession: Checking PAPI plugin status for tenant ${whatsapp.tenantId}`);
            const plugin = await Plugin_1.default.findOne({ where: { slug: "engine-papi" } });
            if (plugin) {
                const installation = await PluginInstallation_1.default.findOne({
                    where: {
                        pluginId: plugin.id,
                        tenantId: whatsapp.tenantId,
                        status: "active"
                    }
                });
                if (!installation) {
                    logger_1.logger.warn(`StartWhatsAppSession: PAPI plugin found but not active for tenant ${whatsapp.tenantId}`);
                    throw new AppError_1.default("ERR_PLUGIN_NOT_ACTIVE_PAPI", 403);
                }
                logger_1.logger.info(`StartWhatsAppSession: PAPI plugin active. Fetching settings.`);
                // Fetch settings for PAPI
                const urlSetting = await Setting_1.default.findOne({ where: { key: "papiUrl", tenantId: whatsapp.tenantId } });
                const keySetting = await Setting_1.default.findOne({ where: { key: "papiKey", tenantId: whatsapp.tenantId } });
                papiUrl = urlSetting?.value;
                papiKey = keySetting?.value;
                if (!papiUrl) {
                    logger_1.logger.error(`StartWhatsAppSession: papiUrl setting missing for tenant ${whatsapp.tenantId}`);
                    throw new AppError_1.default("ERR_PAPI_URL_NOT_CONFIGURED", 400);
                }
            }
            logger_1.logger.info(`StartWhatsAppSession: PAPI settings loaded. URL provided: ${!!papiUrl}, Key provided: ${!!papiKey}`);
        }
        else {
            logger_1.logger.info(`StartWhatsAppSession: Engine '${whatsapp.engineType}' selected; skipping PAPI plugin checks.`);
        }
        // [NEW] Auto-configure Webhook URL based on Frontend/App Domain
        // The engine-papi is exposed via Traefik at /plugins/papi
        const appDomain = process.env.FRONTEND_URL || "http://app.localhost";
        // Ensure no trailing slash
        const cleanDomain = appDomain.endsWith("/") ? appDomain.slice(0, -1) : appDomain;
        const papiWebhookUrl = `${cleanDomain}/plugins/papi/webhook`;
        let commandType = "session.start";
        let exchange = "wbot.commands";
        let routingKey = RabbitMQService_1.default.generateRoutingKey(whatsapp.tenantId, whatsapp.engineType || "whaileys", whatsapp.id, "session.start");
        // WEBCHAT ROUTING LOGIC
        if (whatsapp.type === "webchat") {
            commandType = "webchat.session.start";
            exchange = "webchat.commands";
            routingKey = `webchat.tenant.${whatsapp.tenantId}.${whatsapp.id}.session.start`;
            logger_1.logger.info(`Routing session ${whatsapp.id} to Webchat Engine`);
        }
        const command = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            tenantId: whatsapp.tenantId,
            type: commandType,
            payload: {
                sessionId: whatsapp.id,
                sessionInstanceId, // [NEW] Unique ID
                usePairingCode,
                phoneNumber,
                name: whatsapp.name,
                syncHistory: whatsapp.syncHistory,
                syncPeriod: whatsapp.syncPeriod,
                keepAlive: whatsapp.keepAlive,
                webchatId: whatsapp.id, // For webchat handler compatibility
                force,
                papiUrl,
                papiKey,
                webhookUrl: papiWebhookUrl // [NEW] Pass auto-generated webhook URL
            }
        };
        await RabbitMQService_1.default.publishCommand(routingKey, command, exchange);
        logger_1.logger.info(`Session start command published for session ${whatsapp.id} (Instance: ${sessionInstanceId})`);
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
