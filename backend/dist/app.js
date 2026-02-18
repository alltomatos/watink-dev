"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setReady = void 0;
require("./bootstrap");
require("reflect-metadata");
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const Sentry = __importStar(require("@sentry/node"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./config/swagger"));
require("./database");
const upload_1 = __importDefault(require("./config/upload"));
const AppError_1 = __importDefault(require("./errors/AppError"));
const routes_1 = __importDefault(require("./routes"));
const logger_1 = require("./utils/logger");
const PluginLoader_1 = __importDefault(require("./services/PluginServices/PluginLoader"));
Sentry.init({ dsn: process.env.SENTRY_DSN });
const app = (0, express_1.default)();
let isReady = false;
const setReady = () => { isReady = true; };
exports.setReady = setReady;
app.get("/health", (req, res) => {
    if (isReady) {
        return res.status(200).send("OK");
    }
    return res.status(503).send("Service Initializing");
});
app.use((0, cors_1.default)({
    credentials: true,
    origin: (origin, callback) => {
        callback(null, true);
    }
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(Sentry.Handlers.requestHandler());
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default));
app.use("/public", express_1.default.static(upload_1.default.directory));
app.use((req, res, next) => {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    logger_1.logger.info(`${req.method} ${req.url}`);
    next();
});
app.get("/test", async (req, res) => {
    try {
        const { Sequelize } = require("sequelize");
        const dbConfig = require("./config/database");
        const sequelize = new Sequelize(dbConfig);
        await sequelize.authenticate();
        res.send("Backend and Database are working!");
    }
    catch (err) {
        res.status(500).send("Backend is working, but Database is not reachable.");
    }
});
// Plugin Routes
app.use("/plugins/custom", PluginLoader_1.default.getInstance().getRouter());
app.use(routes_1.default);
app.use(Sentry.Handlers.errorHandler());
app.use(async (err, req, res, _) => {
    if (err instanceof AppError_1.default) {
        logger_1.logger.warn(err);
        return res.status(err.statusCode).json({ error: err.message });
    }
    logger_1.logger.error(err);
    return res.status(500).json({ error: "Internal server error" });
});
exports.default = app;
