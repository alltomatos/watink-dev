"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = __importDefault(require("../models/Setting"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const CheckSettings = async (key) => {
    const setting = await Setting_1.default.findOne({
        where: { key }
    });
    if (!setting) {
        throw new AppError_1.default("ERR_NO_SETTING_FOUND", 404);
    }
    return setting.value;
};
exports.default = CheckSettings;
