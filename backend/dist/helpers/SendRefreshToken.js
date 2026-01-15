"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendRefreshToken = void 0;
const SendRefreshToken = (res, token) => {
    res.cookie("jrt", token, { httpOnly: true, sameSite: "none", secure: true });
};
exports.SendRefreshToken = SendRefreshToken;
