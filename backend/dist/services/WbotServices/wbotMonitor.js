"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../utils/logger");
const wbotMonitor = async (wbot, whatsapp) => {
    logger_1.logger.warn("Legacy wbotMonitor called. This should not happen.");
};
exports.default = wbotMonitor;
