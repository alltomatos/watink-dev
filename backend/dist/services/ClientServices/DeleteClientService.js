"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Client_1 = __importDefault(require("../../models/Client"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const DeleteClientService = async (clientId, tenantId) => {
    const client = await Client_1.default.findOne({
        where: { id: clientId, tenantId }
    });
    if (!client) {
        throw new AppError_1.default("ERR_CLIENT_NOT_FOUND", 404);
    }
    // Cascade delete will handle contacts and addresses
    await client.destroy();
};
exports.default = DeleteClientService;
