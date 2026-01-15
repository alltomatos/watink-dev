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
    getValue(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.get(key);
        });
    }
    setValue(key, value, mode, duration) {
        return __awaiter(this, void 0, void 0, function* () {
            if (mode && duration) {
                return this.client.set(key, value, mode, duration);
            }
            return this.client.set(key, value);
        });
    }
    delValue(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.del(key);
        });
    }
    // Lock implementation: SET key value NX EX duration
    setNx(key, value, durationSeconds) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.client.set(key, value, "EX", durationSeconds, "NX");
            return result === "OK";
        });
    }
    info() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client.info();
        });
    }
}
exports.RedisService = RedisService;
