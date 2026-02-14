"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../../models/User"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const CreateTokens_1 = require("../../helpers/CreateTokens");
const SerializeUser_1 = require("../../helpers/SerializeUser");
const context_1 = __importDefault(require("../../libs/context"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const Group_1 = __importDefault(require("../../models/Group"));
const Permission_1 = __importDefault(require("../../models/Permission"));
const Plugin_1 = __importDefault(require("../../models/Plugin"));
const PluginInstallation_1 = __importDefault(require("../../models/PluginInstallation"));
const Tenant_1 = __importDefault(require("../../models/Tenant"));
const Role_1 = __importDefault(require("../../models/Role"));
const sequelize_1 = require("sequelize");
const AuthUserService = async ({ email, password }) => {
    const user = await User_1.default.findOne({
        where: { email },
        include: [
            { model: Tenant_1.default, as: "tenant", attributes: ["id", "name", "status"] },
            { model: Queue_1.default, as: "queues", attributes: ["id", "name", "color"] },
            { model: Whatsapp_1.default, as: "whatsapp", attributes: ["id", "name"] },
            {
                model: Group_1.default,
                as: "groups",
                include: [
                    {
                        model: Role_1.default,
                        as: "roles",
                        include: [{ model: Permission_1.default, as: "permissions", attributes: ["id", "resource", "action"] }]
                    },
                    {
                        model: Permission_1.default,
                        as: "permissions",
                        attributes: ["id", "resource", "action"]
                    }
                ]
            },
            {
                model: Role_1.default,
                as: "roles",
                include: [{ model: Permission_1.default, as: "permissions", attributes: ["id", "resource", "action"] }]
            }
        ]
    });
    if (!user) {
        throw new AppError_1.default("ERR_INVALID_CREDENTIALS", 401);
    }
    if (process.env.TENANTS === "true" && user.tenant?.status === "inactive") {
        throw new AppError_1.default("ERR_TENANT_INACTIVE", 401);
    }
    if (!(await user.checkPassword(password))) {
        throw new AppError_1.default("ERR_INVALID_CREDENTIALS", 401);
    }
    // Check if user is disabled
    if (user.enabled === false) {
        throw new AppError_1.default("ERR_USER_DISABLED", 401);
    }
    // Check if email is verified
    // Enforce verification ONLY if SMTP is active
    if (user.emailVerified === false) {
        const tenantId = user.tenantId;
        let smtpActive = false;
        if (tenantId) {
            const smtpPlugin = await Plugin_1.default.findOne({
                where: {
                    slug: {
                        [sequelize_1.Op.like]: "%smtp%"
                    }
                }
            });
            if (smtpPlugin) {
                const pluginInstallation = await PluginInstallation_1.default.findOne({
                    where: {
                        tenantId,
                        pluginId: smtpPlugin.id,
                        status: "active"
                    }
                });
                if (pluginInstallation) {
                    smtpActive = true;
                }
            }
        }
        if (smtpActive) {
            throw new AppError_1.default("ERR_EMAIL_NOT_VERIFIED", 401);
        }
    }
    // Force tenant isolation in Sequelize hooks via context
    return context_1.default.run({ tenantId: user.tenantId.toString(), userId: user.id.toString() }, () => {
        const token = (0, CreateTokens_1.createAccessToken)(user);
        const refreshToken = (0, CreateTokens_1.createRefreshToken)(user);
        const serializedUser = (0, SerializeUser_1.SerializeUser)(user);
        return {
            serializedUser,
            token,
            refreshToken
        };
    });
};
exports.default = AuthUserService;
