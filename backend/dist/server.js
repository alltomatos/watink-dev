"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_graceful_shutdown_1 = __importDefault(require("http-graceful-shutdown"));
const app_1 = __importStar(require("./app"));
const socket_1 = require("./libs/socket");
const logger_1 = require("./utils/logger");
const EventListener_1 = require("./services/WbotServices/EventListener");
const RabbitMQService_1 = __importDefault(require("./services/RabbitMQService"));
const StartAllWhatsAppsSessions_1 = require("./services/WbotServices/StartAllWhatsAppsSessions");
const CommandListener_1 = require("./services/WbotServices/CommandListener");
const FlowWorkerService_1 = __importDefault(require("./services/FlowServices/FlowWorkerService"));
const PluginLoader_1 = __importDefault(require("./services/PluginServices/PluginLoader"));
const WatinkCore_1 = __importDefault(require("./services/PluginServices/WatinkCore"));
const startServer = async () => {
    await RabbitMQService_1.default.connect();
    const server = app_1.default.listen(process.env.PORT, () => {
        logger_1.logger.info(`Server started on port: ${process.env.PORT}`);
    });
    (0, socket_1.initIO)(server);
    // Initialize Plugins
    const loader = PluginLoader_1.default.getInstance();
    const core = new WatinkCore_1.default(loader.getRouter());
    await loader.init(core);
    await (0, EventListener_1.EventListener)();
    await (0, CommandListener_1.CommandListener)();
    // Initialize Flow Engine Worker (Consumer)
    await FlowWorkerService_1.default.start();
    (0, StartAllWhatsAppsSessions_1.StartAllWhatsAppsSessions)();
    (0, app_1.setReady)();
    (0, http_graceful_shutdown_1.default)(server);
};
startServer();
