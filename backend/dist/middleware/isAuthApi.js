"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../errors/AppError"));
const ListSettingByValueService_1 = __importDefault(require("../services/SettingServices/ListSettingByValueService"));
const isAuthApi = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new AppError_1.default("ERR_SESSION_EXPIRED", 401);
    }
    const [, token] = authHeader.split(" ");
    try {
        const getToken = await (0, ListSettingByValueService_1.default)(token);
        if (!getToken) {
            throw new AppError_1.default("ERR_SESSION_EXPIRED", 401);
        }
        if (getToken.value !== token) {
            throw new AppError_1.default("ERR_SESSION_EXPIRED", 401);
        }
    }
    catch (err) {
        console.log(err);
        throw new AppError_1.default("Invalid token. We'll try to assign a new one on next request", 403);
    }
    return next();
};
exports.default = isAuthApi;
