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
exports.listPermissions = exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const Group_1 = __importDefault(require("../models/Group"));
const Role_1 = __importDefault(require("../models/Role"));
const User_1 = __importDefault(require("../models/User"));
const Permission_1 = __importDefault(require("../models/Permission")); // Keep for listPermissions
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const groups = yield Group_1.default.findAll({
        where: { tenantId },
        include: [
            { model: Role_1.default, as: "roles", attributes: ["id", "name"] },
            { model: User_1.default, as: "users", attributes: ["id", "name"] },
            { model: Permission_1.default, as: "permissions", attributes: ["id", "resource", "action"] }
        ]
    });
    return res.json(groups);
});
exports.index = index;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tenantId } = req.user;
    const data = req.body;
    const schema = Yup.object().shape({
        name: Yup.string().required()
    });
    try {
        yield schema.validate(data);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const group = yield Group_1.default.create({
        name: data.name,
        tenantId
    });
    if (data.roleIds && data.roleIds.length > 0) {
        const roles = yield Role_1.default.findAll({ where: { id: data.roleIds } });
        yield group.$set("roles", roles, { through: { tenantId } });
    }
    if (data.userIds && data.userIds.length > 0) {
        const users = yield User_1.default.findAll({ where: { id: data.userIds, tenantId } });
        yield group.$set("users", users);
    }
    if (data.permissions && data.permissions.length > 0) {
        const permissions = yield Permission_1.default.findAll({ where: { id: data.permissions } });
        yield group.$set("permissions", permissions, { through: { tenantId } });
    }
    yield group.reload({
        include: [
            { model: Role_1.default, as: "roles" },
            { model: User_1.default, as: "users" },
            { model: Permission_1.default, as: "permissions" }
        ]
    });
    return res.status(200).json(group);
});
exports.store = store;
const show = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupId } = req.params;
    const { tenantId } = req.user;
    const group = yield Group_1.default.findOne({
        where: { id: groupId, tenantId },
        include: [
            { model: Role_1.default, as: "roles" },
            { model: User_1.default, as: "users", attributes: ["id", "name", "email"] },
            { model: Permission_1.default, as: "permissions" }
        ]
    });
    if (!group) {
        throw new AppError_1.default("ERR_NO_GROUP_FOUND", 404);
    }
    return res.json(group);
});
exports.show = show;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupId } = req.params;
    const { tenantId } = req.user;
    const data = req.body;
    const schema = Yup.object().shape({
        name: Yup.string()
    });
    try {
        yield schema.validate(data);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const group = yield Group_1.default.findOne({
        where: { id: groupId, tenantId }
    });
    if (!group) {
        throw new AppError_1.default("ERR_NO_GROUP_FOUND", 404);
    }
    yield group.update({ name: data.name });
    if (data.roleIds) {
        const roles = yield Role_1.default.findAll({ where: { id: data.roleIds } });
        yield group.$set("roles", roles, { through: { tenantId } });
    }
    if (data.userIds) {
        const users = yield User_1.default.findAll({ where: { id: data.userIds, tenantId } });
        yield group.$set("users", users);
    }
    if (data.permissions) {
        const permissions = yield Permission_1.default.findAll({ where: { id: data.permissions } });
        yield group.$set("permissions", permissions, { through: { tenantId } });
    }
    yield group.reload({
        include: [
            { model: Role_1.default, as: "roles" },
            { model: User_1.default, as: "users" },
            { model: Permission_1.default, as: "permissions" }
        ]
    });
    return res.json(group);
});
exports.update = update;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupId } = req.params;
    const { tenantId } = req.user;
    const group = yield Group_1.default.findOne({
        where: { id: groupId, tenantId }
    });
    if (!group) {
        throw new AppError_1.default("ERR_NO_GROUP_FOUND", 404);
    }
    yield group.destroy();
    return res.status(200).json({ message: "Group deleted" });
});
exports.remove = remove;
const listPermissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Mantém listagem de Permissões (Capabilities) para UI de criação de Roles (se houver)
    // Se o frontend esperar Roles aqui, devemos ajustar. Mas o nome é listPermissions.
    const permissions = yield Permission_1.default.findAll();
    return res.json(permissions);
});
exports.listPermissions = listPermissions;
