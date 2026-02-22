"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const QuickAnswer_1 = __importDefault(require("../../models/QuickAnswer"));
const CreateQuickAnswerService = async ({ shortcut, message }) => {
    const nameExists = await QuickAnswer_1.default.findOne({
        where: { shortcut }
    });
    if (nameExists) {
        throw new AppError_1.default("ERR__SHORTCUT_DUPLICATED");
    }
    const quickAnswer = await QuickAnswer_1.default.create({ shortcut, message });
    return quickAnswer;
};
exports.default = CreateQuickAnswerService;
