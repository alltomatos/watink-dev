"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const QuickAnswer_1 = __importDefault(require("../../models/QuickAnswer"));
const ListQuickAnswerService = async ({ searchParam = "", pageNumber = "1", tenantId }) => {
    const normalized = searchParam.toLowerCase().trim();
    const whereCondition = { tenantId };
    if (normalized) {
        whereCondition[sequelize_1.Op.or] = [
            sequelize_1.Sequelize.where(sequelize_1.Sequelize.fn("LOWER", sequelize_1.Sequelize.col("message")), "LIKE", `%${normalized}%`),
            sequelize_1.Sequelize.where(sequelize_1.Sequelize.fn("LOWER", sequelize_1.Sequelize.col("shortcut")), "LIKE", `%${normalized}%`)
        ];
    }
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: quickAnswers } = await QuickAnswer_1.default.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [["shortcut", "ASC"]]
    });
    const hasMore = count > offset + quickAnswers.length;
    return {
        quickAnswers,
        count,
        hasMore
    };
};
exports.default = ListQuickAnswerService;
