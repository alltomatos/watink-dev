"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const QuickAnswer_1 = __importDefault(require("../../models/QuickAnswer"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const ShowQuickAnswerService = async (id) => {
    const quickAnswer = await QuickAnswer_1.default.findByPk(id);
    if (!quickAnswer) {
        throw new AppError_1.default("ERR_NO_QUICK_ANSWERS_FOUND", 404);
    }
    return quickAnswer;
};
exports.default = ShowQuickAnswerService;
