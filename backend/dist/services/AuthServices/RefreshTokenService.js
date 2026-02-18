"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenService = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const ShowUserService_1 = __importDefault(require("../UserServices/ShowUserService"));
const auth_1 = __importDefault(require("../../config/auth"));
const CreateTokens_1 = require("../../helpers/CreateTokens");
const SerializeUser_1 = require("../../helpers/SerializeUser");
const RefreshTokenService = async (res, token) => {
    try {
        const decoded = (0, jsonwebtoken_1.verify)(token, auth_1.default.refreshSecret);
        const { id, tokenVersion } = decoded;
        const user = await (0, ShowUserService_1.default)(id);
        if (user.tokenVersion !== tokenVersion) {
            res.clearCookie("jrt");
            throw new AppError_1.default("ERR_SESSION_EXPIRED", 401);
        }
        const newToken = (0, CreateTokens_1.createAccessToken)(user);
        const refreshToken = (0, CreateTokens_1.createRefreshToken)(user);
        return { user: (0, SerializeUser_1.SerializeUser)(user), newToken, refreshToken };
    }
    catch (err) {
        res.clearCookie("jrt");
        throw new AppError_1.default("ERR_SESSION_EXPIRED", 401);
    }
};
exports.RefreshTokenService = RefreshTokenService;
