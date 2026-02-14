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
const Role_1 = __importDefault(require("../../models/Role"));
const Permission_1 = __importDefault(require("../../models/Permission"));
const ShowUserService = async (id) => {
    const user = await User_1.default.findByPk(id, {
        attributes: [
            "name",
            "id",
            "email",
            "tokenVersion",
            "whatsappId",
            "emailVerified",
            "profileImage"
        ],
        include: [
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
                    { model: Permission_1.default, as: "permissions", attributes: ["id", "resource", "action"] }
                ]
            },
            {
                model: Role_1.default,
                as: "roles",
                include: [{ model: Permission_1.default, as: "permissions", attributes: ["id", "resource", "action"] }]
            },
        ],
        order: [[{ model: Queue_1.default, as: "queues" }, "name", "asc"]]
    });
    if (!user) {
        throw new AppError_1.default("ERR_NO_USER_FOUND", 404);
    }
    const userJson = user.toJSON();
    if (user.groups && user.groups.length > 0) {
        userJson.groupId = user.groups[0].id;
    }
    // Flatten permissions for the frontend/mobile app
    const permissions = new Set();
    // 2. Role Permissions
    user.roles?.forEach(role => {
        role.permissions?.forEach(p => {
            if (p.resource && p.action) {
                permissions.add(`${p.resource}:${p.action}`);
            }
        });
    });
    // 3. Group Permissions (Direct & via Roles)
    user.groups?.forEach(group => {
        // Group -> Roles -> Permissions
        group.roles?.forEach(role => {
            role.permissions?.forEach(p => {
                if (p.resource && p.action) {
                    permissions.add(`${p.resource}:${p.action}`);
                }
            });
        });
        // Group -> Permissions (Direct)
        group.permissions?.forEach(p => {
            if (p.resource && p.action) {
                permissions.add(`${p.resource}:${p.action}`);
            }
        });
    });
    userJson.permissions = Array.from(permissions);
    return userJson;
};
exports.default = ShowUserService;
