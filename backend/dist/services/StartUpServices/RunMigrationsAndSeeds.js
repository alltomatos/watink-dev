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
const child_process_1 = require("child_process");
const util_1 = require("util");
const User_1 = __importDefault(require("../../models/User"));
const logger_1 = require("../../utils/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const RunMigrationsAndSeeds = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logger_1.logger.info("Starting database migration check...");
        // 1. Always run migrations
        // We use 'npx sequelize db:migrate' which uses .sequelizerc (pointing to dist)
        // This assumes the code is running in an environment where 'npx' and 'sequelize-cli' are available.
        logger_1.logger.info("Running migrations...");
        const { stdout: migrateStdout, stderr: migrateStderr } = yield execAsync("npx sequelize db:migrate");
        if (migrateStdout)
            logger_1.logger.info(`Migration output: ${migrateStdout}`);
        if (migrateStderr)
            logger_1.logger.warn(`Migration stderr: ${migrateStderr}`);
        logger_1.logger.info("Migrations executed successfully.");
        // 2. Check if we need to seed
        // We need to ensure the connection is ready or just try. 
        // Since we just ran migrations, the DB is accessible.
        const userCount = yield User_1.default.count();
        if (userCount === 0) {
            logger_1.logger.info("Database appears empty (no users). Running seeds...");
            const { stdout: seedStdout, stderr: seedStderr } = yield execAsync("npx sequelize db:seed:all");
            if (seedStdout)
                logger_1.logger.info(`Seed output: ${seedStdout}`);
            if (seedStderr)
                logger_1.logger.warn(`Seed stderr: ${seedStderr}`);
            logger_1.logger.info("Seeds executed successfully.");
        }
        else {
            logger_1.logger.info("Database already populated. Skipping seeds.");
        }
    }
    catch (error) {
        logger_1.logger.error("Error during database startup (migrations/seeds):");
        logger_1.logger.error(error);
        // Re-throw to prevent server from starting in an inconsistent state
        throw error;
    }
});
exports.default = RunMigrationsAndSeeds;
