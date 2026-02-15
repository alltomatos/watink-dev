"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_graceful_shutdown_1 = __importDefault(require("http-graceful-shutdown"));
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./libs/socket");
const logger_1 = require("./utils/logger");
const EventListener_1 = require("./services/WbotServices/EventListener");
const RabbitMQService_1 = __importDefault(require("./services/RabbitMQService"));
const StartAllWhatsAppsSessions_1 = require("./services/WbotServices/StartAllWhatsAppsSessions");
const CommandListener_1 = require("./services/WbotServices/CommandListener");
const FlowWorkerService_1 = __importDefault(require("./services/FlowServices/FlowWorkerService"));
const startServer = async () => {
    await RabbitMQService_1.default.connect();
    const server = app_1.default.listen(process.env.PORT, () => {
        logger_1.logger.info(`Server started on port: ${process.env.PORT}`);
    });
    (0, socket_1.initIO)(server);
    await (0, EventListener_1.EventListener)();
    await (0, CommandListener_1.CommandListener)();
    // Initialize Flow Engine Worker (Consumer)
    await FlowWorkerService_1.default.start();
    (0, StartAllWhatsAppsSessions_1.StartAllWhatsAppsSessions)();
    (0, http_graceful_shutdown_1.default)(server);
};
startServer();
