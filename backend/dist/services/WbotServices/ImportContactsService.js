"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../utils/logger");
const ImportContactsService = async (userId) => {
    logger_1.logger.warn("ImportContactsService is disabled in Microservices mode.");
};
exports.default = ImportContactsService;
