"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessage = exports.wbotMessageListener = void 0;
const logger_1 = require("../../utils/logger");
const wbotMessageListener = async (wbot) => {
    logger_1.logger.warn("Legacy wbotMessageListener called. This should not happen in Microservices mode.");
};
exports.wbotMessageListener = wbotMessageListener;
const handleMessage = async (msg, wbot) => {
    logger_1.logger.warn("Legacy handleMessage called.");
};
exports.handleMessage = handleMessage;
