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
const Queue_1 = __importDefault(require("../../models/Queue"));
const User_1 = __importDefault(require("../../models/User"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const ListUsersService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ searchParam = "", pageNumber = "1", tenantId }) {
    let whereCondition = {};
    if (tenantId !== undefined) {
        whereCondition.tenantId = tenantId;
    }
    console.log("DEBUG: ListUsersService tenantId:", tenantId, "whereCondition:", whereCondition);
    if (searchParam) {
        whereCondition = Object.assign(Object.assign({}, whereCondition), { [sequelize_1.Op.or]: [
                {
                    "$User.name$": sequelize_1.Sequelize.where(sequelize_1.Sequelize.fn("LOWER", sequelize_1.Sequelize.col("User.name")), "LIKE", `%${searchParam.toLowerCase()}%`)
                },
                { email: { [sequelize_1.Op.iLike]: `%${searchParam.toLowerCase()}%` } }
            ] });
    }
    const limit = 20;
    const offset = limit * (+pageNumber - 1);
    const { count, rows: users } = yield User_1.default.findAndCountAll({
        where: whereCondition,
        attributes: ["name", "id", "email", "profile", "createdAt"],
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        include: [
            { model: Queue_1.default, as: "queues", attributes: ["id", "name", "color"] },
            { model: Whatsapp_1.default, as: "whatsapp", attributes: ["id", "name"] }
        ]
    });
    const hasMore = count > offset + users.length;
    return {
        users,
        count,
        hasMore
    };
});
exports.default = ListUsersService;
