"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = __importDefault(require("../../models/Setting"));
const UpdateSettingService = async ({ key, value, tenantId }) => {
    let setting = await Setting_1.default.findOne({
        where: { key, tenantId }
    });
    if (!setting) {
        setting = await Setting_1.default.create({ key, value, tenantId });
    }
    else {
        await setting.update({ value });
    }
    return setting;
};
exports.default = UpdateSettingService;
