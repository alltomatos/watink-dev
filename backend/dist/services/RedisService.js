"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
class RedisService {
    constructor() {
        this.client = new ioredis_1.default(process.env.REDIS_URI || process.env.REDIS_URL || "redis://redis:6379");
        this.client.on("connect", () => {
            logger_1.logger.info("RedisService: Connected to Redis");
        });
        this.client.on("error", (err) => {
            logger_1.logger.error(`RedisService Error: ${err}`);
        });
    }
    static getInstance() {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }
    getClient() {
        return this.client;
    }
    async getValue(key) {
        return this.client.get(key);
    }
    async setValue(key, value, mode, duration) {
        if (mode && duration) {
            return this.client.set(key, value, mode, duration);
        }
        return this.client.set(key, value);
    }
    async delValue(key) {
        return this.client.del(key);
    }
    // Lock implementation: SET key value NX EX duration
    async setNx(key, value, durationSeconds) {
        const result = await this.client.set(key, value, "EX", durationSeconds, "NX");
        return result === "OK";
    }
    async info() {
        return this.client.info();
    }
}
exports.RedisService = RedisService;
