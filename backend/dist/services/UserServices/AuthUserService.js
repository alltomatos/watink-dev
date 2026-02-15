"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../../models/User"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const CreateTokens_1 = require("../../helpers/CreateTokens");
const SerializeUser_1 = require("../../helpers/SerializeUser");
const Queue_1 = __importDefault(require("../../models/Queue"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const Group_1 = __importDefault(require("../../models/Group"));
const Permission_1 = __importDefault(require("../../models/Permission"));
const AuthUserService = async ({ email, password }) => {
    const user = await User_1.default.findOne({
        where: { email },
        include: [
            { model: Queue_1.default, as: "queues", attributes: ["id", "name", "color"] },
            { model: Whatsapp_1.default, as: "whatsapp", attributes: ["id", "name"] },
            {
                model: Group_1.default,
                as: "group",
                include: [{ model: Permission_1.default, as: "permissions", attributes: ["id", "name"] }]
            },
            { model: Permission_1.default, as: "permissions", attributes: ["id", "name"] }
        ]
    });
    if (!user) {
        throw new AppError_1.default("ERR_INVALID_CREDENTIALS", 401);
    }
    if (!(await user.checkPassword(password))) {
        throw new AppError_1.default("ERR_INVALID_CREDENTIALS", 401);
    }
    const token = (0, CreateTokens_1.createAccessToken)(user);
    const refreshToken = (0, CreateTokens_1.createRefreshToken)(user);
    const serializedUser = (0, SerializeUser_1.SerializeUser)(user);
    return {
        serializedUser,
        token,
        refreshToken
    };
};
exports.default = AuthUserService;
