"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./bootstrap");
require("reflect-metadata");
require("./database");
const RabbitMQService_1 = __importDefault(require("./services/RabbitMQService"));
const FlowWorkerService_1 = __importDefault(require("./services/FlowServices/FlowWorkerService"));
const logger_1 = require("./utils/logger");
const http_1 = require("http");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const startWorker = () => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.info("Starting Flow Engine Worker...");
    try {
        // Connect to RabbitMQ
        yield RabbitMQService_1.default.connect();
        // Start Worker Consumer
        yield FlowWorkerService_1.default.start();
        logger_1.logger.info("Flow Engine Worker is running!");
        // Lightweight HTTP server for /version
        const port = Number(process.env.FLOW_WORKER_PORT || 3336);
        const server = (0, http_1.createServer)((req, res) => {
            if (req.method === "GET" && req.url === "/version") {
                let version = "0.0.0";
                try {
                    const pkgPath = path_1.default.join(process.cwd(), "package.json");
                    if (fs_1.default.existsSync(pkgPath)) {
                        const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, "utf-8"));
                        version = pkg.version || version;
                    }
                }
                catch (_a) { }
                const lastUpdated = process.env.BUILD_TIMESTAMP ||
                    new Date(Number(process.env.BUILD_UNIX_TS || Date.now())).toISOString();
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Cache-Control", "no-store");
                res.statusCode = 200;
                res.end(JSON.stringify({ service: "flow-worker", version, lastUpdated }));
                return;
            }
            res.statusCode = 404;
            res.end("Not Found");
        });
        server.listen(port, () => { });
        // Keep process alive
        process.on("SIGTERM", () => {
            logger_1.logger.info("SIGTERM received. Shutting down worker...");
            process.exit(0);
        });
    }
    catch (err) {
        logger_1.logger.error(`Fatal Error in Flow Worker: ${err}`);
        process.exit(1);
    }
});
startWorker();
