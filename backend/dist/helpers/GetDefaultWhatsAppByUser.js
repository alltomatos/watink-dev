"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../models/User"));
const logger_1 = require("../utils/logger");
const GetDefaultWhatsAppByUser = async (userId) => {
    const user = await User_1.default.findByPk(userId, { include: ["whatsapp"] });
    if (user === null) {
        return null;
    }
    if (user.whatsapp !== null) {
        logger_1.logger.info(`Found whatsapp linked to user '${user.name}' is '${user.whatsapp.name}'.`);
    }
    return user.whatsapp;
};
exports.default = GetDefaultWhatsAppByUser;
