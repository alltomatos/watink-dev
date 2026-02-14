"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const QuickAnswer_1 = __importDefault(require("../../models/QuickAnswer"));
const CreateQuickAnswerService = async ({ shortcut, message, mediaType = "text", dataJson = null, tenantId }) => {
    const nameExists = await QuickAnswer_1.default.findOne({
        where: { shortcut, tenantId }
    });
    if (nameExists) {
        throw new AppError_1.default("ERR__SHORTCUT_DUPLICATED");
    }
    const quickAnswer = await QuickAnswer_1.default.create({ shortcut, message, mediaType, dataJson, tenantId });
    return quickAnswer;
};
exports.default = CreateQuickAnswerService;
