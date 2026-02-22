"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const CheckSettings_1 = __importDefault(require("../helpers/CheckSettings"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const CreateUserService_1 = __importDefault(require("../services/UserServices/CreateUserService"));
const ListUsersService_1 = __importDefault(require("../services/UserServices/ListUsersService"));
const UpdateUserService_1 = __importDefault(require("../services/UserServices/UpdateUserService"));
const ShowUserService_1 = __importDefault(require("../services/UserServices/ShowUserService"));
const DeleteUserService_1 = __importDefault(require("../services/UserServices/DeleteUserService"));
const index = async (req, res) => {
    const { searchParam, pageNumber } = req.query;
    const { tenantId } = req.user;
    const { users, count, hasMore } = await (0, ListUsersService_1.default)({
        searchParam,
        pageNumber,
        tenantId
    });
    return res.json({ users, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const { email, password, name, profile, queueIds, whatsappId } = req.body;
    if (req.url === "/signup" &&
        (await (0, CheckSettings_1.default)("userCreation")) === "disabled") {
        throw new AppError_1.default("ERR_USER_CREATION_DISABLED", 403);
    }
    else if (req.url !== "/signup" && req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const user = await (0, CreateUserService_1.default)({
        email,
        password,
        name,
        profile,
        queueIds,
        whatsappId
    });
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "create",
        user
    });
    return res.status(200).json(user);
};
exports.store = store;
const show = async (req, res) => {
    const { userId } = req.params;
    const user = await (0, ShowUserService_1.default)(userId);
    return res.status(200).json(user);
};
exports.show = show;
const update = async (req, res) => {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { userId } = req.params;
    const userData = req.body;
    const user = await (0, UpdateUserService_1.default)({ userData, userId, requestUser: req.user });
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "update",
        user
    });
    return res.status(200).json(user);
};
exports.update = update;
const remove = async (req, res) => {
    const { userId } = req.params;
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    await (0, DeleteUserService_1.default)(userId, req.user);
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "delete",
        userId
    });
    return res.status(200).json({ message: "User deleted" });
};
exports.remove = remove;
