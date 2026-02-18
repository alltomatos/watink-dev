"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Contact_1 = __importDefault(require("../../models/Contact"));
const ListContactsService = async ({ searchParam = "", pageNumber = "1" }) => {
    const whereCondition = {
        [sequelize_1.Op.or]: [
            {
                name: sequelize_1.Sequelize.where(sequelize_1.Sequelize.fn("LOWER", sequelize_1.Sequelize.col("name")), "LIKE", `%${searchParam.toLowerCase().trim()}%`)
            },
            { number: { [sequelize_1.Op.iLike]: `%${searchParam.toLowerCase().trim()}%` } }
        ]
    };
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: contacts } = await Contact_1.default.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [["name", "ASC"]]
    });
    const hasMore = count > offset + contacts.length;
    return {
        contacts,
        count,
        hasMore
    };
};
exports.default = ListContactsService;
