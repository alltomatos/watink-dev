"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../../models/User"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const Group_1 = __importDefault(require("../../models/Group"));
const Permission_1 = __importDefault(require("../../models/Permission"));
const ShowUserService = async (id) => {
    const user = await User_1.default.findByPk(id, {
        attributes: [
            "name",
            "id",
            "email",
            "profile",
            "tokenVersion",
            "whatsappId"
        ],
        include: [
            { model: Queue_1.default, as: "queues", attributes: ["id", "name", "color"] },
            { model: Whatsapp_1.default, as: "whatsapp", attributes: ["id", "name"] },
            {
                model: Group_1.default,
                as: "group",
                include: [{ model: Permission_1.default, as: "permissions", attributes: ["id", "name"] }]
            },
            { model: Permission_1.default, as: "permissions", attributes: ["id", "name"] }
        ],
        order: [[{ model: Queue_1.default, as: "queues" }, "name", "asc"]]
    });
    if (!user) {
        throw new AppError_1.default("ERR_NO_USER_FOUND", 404);
    }
    return user;
};
exports.default = ShowUserService;
