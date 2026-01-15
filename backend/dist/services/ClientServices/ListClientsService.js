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
const sequelize_1 = require("sequelize");
const Client_1 = __importDefault(require("../../models/Client"));
const ClientContact_1 = __importDefault(require("../../models/ClientContact"));
const ClientAddress_1 = __importDefault(require("../../models/ClientAddress"));
const ListClientsService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ tenantId, searchParam = "", pageNumber = "1", isActive }) {
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
    const { count, rows: clients } = yield Client_1.default.findAndCountAll({
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
});
exports.default = ListClientsService;
