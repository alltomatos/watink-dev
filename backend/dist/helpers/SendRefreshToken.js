"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendRefreshToken = void 0;
const SendRefreshToken = (res, token) => {
    const frontendUrl = process.env.FRONTEND_URL || "";
    const isHttps = frontendUrl.startsWith("https://");
    // If HTTPS, use sameSite: 'none' and secure: true (required for cross-site cookies)
    // If HTTP, use sameSite: 'lax' and secure: false (allows same-site cookies)
    const cookieOptions = {
        httpOnly: true,
        sameSite: isHttps ? "none" : "lax",
        secure: isHttps,
    };
    res.cookie("jrt", token, cookieOptions);
};
exports.SendRefreshToken = SendRefreshToken;
