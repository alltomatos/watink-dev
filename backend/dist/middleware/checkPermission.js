"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../errors/AppError"));
const User_1 = __importDefault(require("../models/User"));
const Group_1 = __importDefault(require("../models/Group"));
const Permission_1 = __importDefault(require("../models/Permission"));
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
        const groupPermissions = user.group?.permissions?.map(p => p.name) || [];
        const individualPermissions = user.permissions?.map(p => p.name) || [];
        // Merge permissions
        const allPermissions = [...new Set([...groupPermissions, ...individualPermissions])];
        if (!allPermissions.includes(permission)) {
            throw new AppError_1.default("ERR_NO_PERMISSION", 403);
        }
        return next();
    };
};
exports.default = checkPermission;
