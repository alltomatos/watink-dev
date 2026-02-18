"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../utils/logger");
const EnrichContactService = async (contact, whatsapp) => {
    logger_1.logger.warn("EnrichContactService: Legacy wbot enrichment disabled.");
    return contact;
};
exports.default = EnrichContactService;
