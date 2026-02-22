"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Client_1 = __importDefault(require("../../models/Client"));
const ClientContact_1 = __importDefault(require("../../models/ClientContact"));
const ClientAddress_1 = __importDefault(require("../../models/ClientAddress"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const ShowClientService = async (clientId, tenantId) => {
    const client = await Client_1.default.findOne({
        where: { id: clientId, tenantId },
        include: [
            { model: ClientContact_1.default, as: "contacts" },
            { model: ClientAddress_1.default, as: "addresses" }
        ]
    });
    if (!client) {
        throw new AppError_1.default("ERR_CLIENT_NOT_FOUND", 404);
    }
    return client;
};
exports.default = ShowClientService;
