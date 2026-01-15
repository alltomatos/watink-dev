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
exports.CommandListener = void 0;
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const logger_1 = require("../../utils/logger");
const CommandListener = () => __awaiter(void 0, void 0, void 0, function* () {
    // Backend should NOT listen to contact.sync commands intended for the Engine
    const routingKeys = [];
    // Se houver outros comandos que o Backend deva processar, adicione aqui.
    // Por enquanto, contact.sync é processado apenas pelo Engine.
    if (routingKeys.length > 0) {
        yield RabbitMQService_1.default.consumeCommands("api.commands.process", routingKeys, (msg) => __awaiter(void 0, void 0, void 0, function* () {
            logger_1.logger.info(`Command received: ${msg.type}`);
            switch (msg.type) {
                // case "some.other.command":
                //     await handleSomething(msg.payload);
                //     break;
                default:
                    logger_1.logger.warn(`Unknown command type: ${msg.type}`);
            }
        }));
    }
});
exports.CommandListener = CommandListener;
