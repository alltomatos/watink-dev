"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Setting_1 = __importDefault(require("../../models/Setting"));
const ListSettingByKeyService = async (value) => {
    const settings = await Setting_1.default.findOne({
        where: { value }
    });
    if (!settings) {
        throw new AppError_1.default("ERR_NO_API_TOKEN_FOUND", 404);
    }
    return { key: settings.key, value: settings.value };
};
exports.default = ListSettingByKeyService;
