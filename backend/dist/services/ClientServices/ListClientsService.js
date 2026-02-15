"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Client_1 = __importDefault(require("../../models/Client"));
const ClientContact_1 = __importDefault(require("../../models/ClientContact"));
const ClientAddress_1 = __importDefault(require("../../models/ClientAddress"));
const ListClientsService = async ({ tenantId, searchParam = "", pageNumber = "1", isActive }) => {
    const limit = 20;
    const offset = limit * (Number(pageNumber) - 1);
    const whereCondition = {
        tenantId
    };
    if (searchParam) {
        whereCondition[sequelize_1.Op.or] = [
            { name: { [sequelize_1.Op.iLike]: `%${searchParam}%` } },
            { document: { [sequelize_1.Op.iLike]: `%${searchParam}%` } },
            { email: { [sequelize_1.Op.iLike]: `%${searchParam}%` } }
        ];
    }
    if (isActive !== undefined) {
        whereCondition.isActive = isActive;
    }
    const { count, rows: clients } = await Client_1.default.findAndCountAll({
        where: whereCondition,
        include: [
            { model: ClientContact_1.default, as: "contacts" },
            { model: ClientAddress_1.default, as: "addresses" }
        ],
        limit,
        offset,
        order: [["name", "ASC"]]
    });
    const hasMore = count > offset + clients.length;
    return {
        clients,
        count,
        hasMore
    };
};
exports.default = ListClientsService;
