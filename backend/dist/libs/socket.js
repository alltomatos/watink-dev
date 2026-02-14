"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initIO = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = require("jsonwebtoken");
const AppError_1 = __importDefault(require("../errors/AppError"));
const logger_1 = require("../utils/logger");
const auth_1 = __importDefault(require("../config/auth"));
const UserOnlineService_1 = __importDefault(require("../services/UserServices/UserOnlineService"));
let io;
const initIO = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                callback(null, true);
            },
            credentials: true
        },
        allowEIO3: true
    });
    io.on("connection", async (socket) => {
        logger_1.logger.info("Socket Connection Attempt");
        let { token } = socket.handshake.query;
        if (!token && socket.handshake.auth?.token) {
            token = socket.handshake.auth.token;
            logger_1.logger.info(`[Socket Debug] Token found in handshake.auth`);
        }
        if (!token && socket.handshake.headers?.authorization) {
            const authHeader = socket.handshake.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
                logger_1.logger.info(`[Socket Debug] Token found in Authorization header`);
            }
        }
        logger_1.logger.info(`[Socket Debug] Final Token provided: ${token ? "YES" : "NO"}`);
        let tokenData = null;
        try {
            tokenData = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
            logger_1.logger.debug(JSON.stringify(tokenData), "io-onConnection: tokenData");
        }
        catch (err) {
            logger_1.logger.error(`[Socket Debug] Token verification failed: ${err.message}`);
            if (err.name === "TokenExpiredError") {
                logger_1.logger.warn(`Socket authentication failed: Token expired at ${err.expiredAt}`);
            }
            else {
                logger_1.logger.error(JSON.stringify(err), "Error decoding token");
            }
            socket.disconnect();
            return io;
        }
        // Extract userId from token
        const userId = tokenData?.id;
        // Track user as online in Redis
        if (userId) {
            await UserOnlineService_1.default.setUserOnline(userId, socket.id);
            // Store userId in socket data for disconnect handler
            socket.data = socket.data || {};
            socket.data.userId = userId;
        }
        logger_1.logger.info(`Client Connected (userId: ${userId || "unknown"}, socketId: ${socket.id})`);
        socket.on("joinChatBox", (ticketId) => {
            logger_1.logger.info("A client joined a ticket channel");
            socket.join(ticketId);
        });
        socket.on("joinNotification", () => {
            logger_1.logger.info("A client joined notification channel");
            socket.join("notification");
        });
        socket.on("joinTickets", (status) => {
            logger_1.logger.info(`A client joined to ${status} tickets channel.`);
            socket.join(status);
        });
        socket.on("joinHelpdeskKanban", () => {
            logger_1.logger.info("A client joined helpdesk kanban channel");
            socket.join("helpdesk-kanban");
        });
        // Heartbeat event to refresh online status (optional client-side ping)
        socket.on("heartbeat", async () => {
            if (socket.data.userId) {
                await UserOnlineService_1.default.refreshUserOnline(socket.data.userId);
            }
        });
        socket.on("disconnect", async () => {
            const disconnectedUserId = socket.data.userId;
            if (disconnectedUserId) {
                await UserOnlineService_1.default.setUserOffline(disconnectedUserId, socket.id);
            }
            logger_1.logger.info(`Client disconnected (userId: ${disconnectedUserId || "unknown"}, socketId: ${socket.id})`);
        });
        return socket;
    });
    return io;
};
exports.initIO = initIO;
const getIO = () => {
    if (!io) {
        throw new AppError_1.default("Socket IO not initialized");
    }
    return io;
};
exports.getIO = getIO;
