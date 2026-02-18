"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetWbotMessage = void 0;
const AppError_1 = __importDefault(require("../errors/AppError"));
const GetWbotMessage = async (ticket, messageId) => {
    throw new AppError_1.default("Legacy GetWbotMessage is disabled. Use Microservices/RabbitMQ.");
};
exports.GetWbotMessage = GetWbotMessage;
exports.default = exports.GetWbotMessage;
