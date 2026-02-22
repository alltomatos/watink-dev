"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandListener = void 0;
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const logger_1 = require("../../utils/logger");
const CommandListener = async () => {
    // Backend should NOT listen to contact.sync commands intended for the Engine
    const routingKeys = [];
    // Se houver outros comandos que o Backend deva processar, adicione aqui.
    // Por enquanto, contact.sync é processado apenas pelo Engine.
    if (routingKeys.length > 0) {
        await RabbitMQService_1.default.consumeCommands("api.commands.process", routingKeys, async (msg) => {
            logger_1.logger.info(`Command received: ${msg.type}`);
            switch (msg.type) {
                // case "some.other.command":
                //     await handleSomething(msg.payload);
                //     break;
                default:
                    logger_1.logger.warn(`Unknown command type: ${msg.type}`);
            }
        });
    }
};
exports.CommandListener = CommandListener;
