"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPermissions = exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const Group_1 = __importDefault(require("../models/Group"));
const Permission_1 = __importDefault(require("../models/Permission"));
const User_1 = __importDefault(require("../models/User"));
const index = async (req, res) => {
    try {
        const { tenantId } = req.user;
        console.log("DEBUG: GroupController.index tenantId:", tenantId, "UserID:", req.user.id);
        console.log("DEBUG: GroupController.index tenantId:", tenantId, "User:", req.user);
        const groups = await Group_1.default.findAll({
            where: { tenantId },
            include: [
                { model: Permission_1.default, as: "permissions", attributes: ["id", "name"] },
                { model: User_1.default, as: "users", attributes: ["id", "name"] }
            ]
        });
        return res.json(groups);
    }
    catch (err) {
        console.error("DEBUG: GroupController.index Error:", err);
        throw new AppError_1.default("INTERNAL_SERVER_ERROR", 500);
    }
};
exports.index = index;
const store = async (req, res) => {
    const { tenantId } = req.user;
    const data = req.body;
    const schema = Yup.object().shape({
        name: Yup.string().required()
    });
    try {
        await schema.validate(data);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const group = await Group_1.default.create({
        name: data.name,
        tenantId
    });
    if (data.permissions && data.permissions.length > 0) {
        await group.$set("permissions", data.permissions);
    }
    // Associar IDs de permissão pivot com tenantId (Se necessário customizar a pivot, faríamos loop)
    // Mas como a pivot tem tenantId, o sequelize pode não preencher auto se usarmos apenas $set ids.
    // Vamos corrigir isso: para GroupPermission precisamos setar tenantId.
    // Como o Sequelize BelongsToMany set padrão é simples, é melhor iterar se quisermos garantir tenantId na pivot.
    // OBS: Na migration, GroupPermissions.tenantId é NotNull.
    // Vamos usar addPermissions passando through options.
    if (data.permissions && data.permissions.length > 0) {
        const permissions = await Permission_1.default.findAll({ where: { id: data.permissions } });
        await group.$set("permissions", permissions, { through: { tenantId } });
    }
    if (data.userIds && data.userIds.length > 0) {
        const users = await User_1.default.findAll({ where: { id: data.userIds, tenantId } });
        await group.$set("users", users);
    }
    await group.reload({
        include: [
            { model: Permission_1.default, as: "permissions" },
            { model: User_1.default, as: "users" }
        ]
    });
    return res.status(200).json(group);
};
exports.store = store;
const show = async (req, res) => {
    const { groupId } = req.params;
    const { tenantId } = req.user;
    const group = await Group_1.default.findOne({
        where: { id: groupId, tenantId },
        include: [
            { model: Permission_1.default, as: "permissions" },
            { model: User_1.default, as: "users", attributes: ["id", "name", "email"] }
        ]
    });
    if (!group) {
        throw new AppError_1.default("ERR_NO_GROUP_FOUND", 404);
    }
    return res.json(group);
};
exports.show = show;
const update = async (req, res) => {
    const { groupId } = req.params;
    const { tenantId } = req.user;
    const data = req.body;
    const schema = Yup.object().shape({
        name: Yup.string()
    });
    try {
        await schema.validate(data);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const group = await Group_1.default.findOne({
        where: { id: groupId, tenantId }
    });
    if (!group) {
        throw new AppError_1.default("ERR_NO_GROUP_FOUND", 404);
    }
    await group.update({ name: data.name });
    if (data.permissions) {
        // Atualiza permissões garantindo tenantId na pivot
        const permissions = await Permission_1.default.findAll({ where: { id: data.permissions } });
        await group.$set("permissions", permissions, { through: { tenantId } });
    }
    if (data.userIds) {
        const users = await User_1.default.findAll({ where: { id: data.userIds, tenantId } });
        await group.$set("users", users);
    }
    await group.reload({
        include: [
            { model: Permission_1.default, as: "permissions" },
            { model: User_1.default, as: "users" }
        ]
    });
    return res.json(group);
};
exports.update = update;
const remove = async (req, res) => {
    const { groupId } = req.params;
    const { tenantId } = req.user;
    const group = await Group_1.default.findOne({
        where: { id: groupId, tenantId }
    });
    if (!group) {
        throw new AppError_1.default("ERR_NO_GROUP_FOUND", 404);
    }
    await group.destroy();
    return res.status(200).json({ message: "Group deleted" });
};
exports.remove = remove;
const listPermissions = async (req, res) => {
    // Listar todas as permissões disponíveis (Seeds globais ou custom)
    const permissions = await Permission_1.default.findAll();
    return res.json(permissions);
};
exports.listPermissions = listPermissions;
