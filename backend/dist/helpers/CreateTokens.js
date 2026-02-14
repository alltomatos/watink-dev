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
    // Determine profile based on roles for legacy compatibility
    const isAdmin = user.roles?.some(role => role.name === "Admin") || user.email === "admin@admin.com";
    const profile = isAdmin ? "admin" : "user";
    return (0, jsonwebtoken_1.sign)({ username: user.name, id: user.id, tenantId: user.tenantId, profile }, secret, {
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
