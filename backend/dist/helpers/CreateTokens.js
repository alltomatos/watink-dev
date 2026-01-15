"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRefreshToken = exports.createAccessToken = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_1 = __importDefault(require("../config/auth"));
const createAccessToken = (user) => {
    const { secret, expiresIn } = auth_1.default;
    return (0, jsonwebtoken_1.sign)({ username: user.name, profile: user.profile, id: user.id, tenantId: user.tenantId }, secret, {
        expiresIn
    });
};
exports.createAccessToken = createAccessToken;
const createRefreshToken = (user) => {
    const { refreshSecret, refreshExpiresIn } = auth_1.default;
    return (0, jsonwebtoken_1.sign)({ id: user.id, tokenVersion: user.tokenVersion }, refreshSecret, {
        expiresIn: refreshExpiresIn
    });
};
exports.createRefreshToken = createRefreshToken;
