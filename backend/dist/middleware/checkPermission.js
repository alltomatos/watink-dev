"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../errors/AppError"));
const User_1 = __importDefault(require("../models/User"));
const Group_1 = __importDefault(require("../models/Group"));
const Permission_1 = __importDefault(require("../models/Permission"));
const Role_1 = __importDefault(require("../models/Role"));
const checkPermission = (permission) => {
    return async (req, res, next) => {
        const { id } = req.user;
        const user = await User_1.default.findByPk(id, {
            include: [
                {
                    model: Group_1.default,
                    as: "group",
                    include: [{ model: Permission_1.default, as: "permissions" }]
                },
                {
                    model: Role_1.default,
                    as: "roles",
                    include: [{ model: Permission_1.default, as: "permissions" }]
                },
                {
                    model: Permission_1.default,
                    as: "permissions"
                }
            ]
        });
        if (!user) {
            throw new AppError_1.default("User not found", 401);
        }
        // Super Admin by profile fallback
        if (user.profile === "admin" || user.profile === "superadmin") {
            return next();
        }
        const legacyPermissions = user.group?.permissions?.map(p => p.name) || [];
        const individualPermissions = user.permissions?.map(p => p.name) || [];
        const rolePermissions = user.roles?.flatMap(role => role.permissions?.map(p => p.name) || []) || [];
        // Merge all permissions
        const allPermissions = [...new Set([
                ...legacyPermissions,
                ...individualPermissions,
                ...rolePermissions
            ])];
        if (!allPermissions.includes(permission)) {
            throw new AppError_1.default("ERR_NO_PERMISSION", 403);
        }
        return next();
    };
};
exports.default = checkPermission;
