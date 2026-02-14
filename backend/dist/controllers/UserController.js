"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualVerify = exports.completeRegistration = exports.verifyEmail = exports.resetPassword = exports.forgotPassword = exports.resendWelcomeEmail = exports.toggleStatus = exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const CheckSettings_1 = __importDefault(require("../helpers/CheckSettings"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const User_1 = __importDefault(require("../models/User"));
const CreateUserService_1 = __importDefault(require("../services/UserServices/CreateUserService"));
const ListUsersService_1 = __importDefault(require("../services/UserServices/ListUsersService"));
const UpdateUserService_1 = __importDefault(require("../services/UserServices/UpdateUserService"));
const ShowUserService_1 = __importDefault(require("../services/UserServices/ShowUserService"));
const DeleteUserService_1 = __importDefault(require("../services/UserServices/DeleteUserService"));
const ToggleUserStatusService_1 = __importDefault(require("../services/UserServices/ToggleUserStatusService"));
const SendPasswordResetEmailService_1 = __importDefault(require("../services/UserServices/SendPasswordResetEmailService"));
const ResetPasswordService_1 = __importDefault(require("../services/UserServices/ResetPasswordService"));
const VerifyEmailService_1 = __importDefault(require("../services/UserServices/VerifyEmailService"));
const CompleteRegistrationService_1 = __importDefault(require("../services/UserServices/CompleteRegistrationService"));
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
    const { email, password, name, queueIds, whatsappId, groupIds, groupId, roleIds } = req.body;
    if (req.url === "/signup" &&
        (await (0, CheckSettings_1.default)("userCreation")) === "disabled") {
        throw new AppError_1.default("ERR_USER_CREATION_DISABLED", 403);
    }
    const user = await (0, CreateUserService_1.default)({
        email,
        password,
        name,
        queueIds,
        whatsappId,
        groupIds,
        groupId,
        roleIds,
        tenantId: req.user?.tenantId || undefined
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
    const { userId } = req.params;
    const userData = req.body;
    const profileImage = req.file?.filename;
    const { permissions: _, ...cleanUserData } = userData;
    const user = await (0, UpdateUserService_1.default)({ userData: { ...cleanUserData, profileImage }, userId, requestUser: req.user });
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
    await (0, DeleteUserService_1.default)(userId, req.user);
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "delete",
        userId
    });
    return res.status(200).json({ message: "User deleted" });
};
exports.remove = remove;
const toggleStatus = async (req, res) => {
    const { userId } = req.params;
    const user = await (0, ToggleUserStatusService_1.default)(userId);
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "update",
        user
    });
    return res.status(200).json(user);
};
exports.toggleStatus = toggleStatus;
const resendWelcomeEmail = async (req, res) => {
    const { userId } = req.params;
    // Use the new service to send a password reset link instead of credentials
    const user = await (0, ShowUserService_1.default)(userId);
    const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    await (0, SendPasswordResetEmailService_1.default)(user.email, appUrl);
    return res.status(200).json({ message: "Email sent successfully" });
};
exports.resendWelcomeEmail = resendWelcomeEmail;
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    await (0, SendPasswordResetEmailService_1.default)(email, appUrl);
    return res.status(200).json({ message: "Email sent successfully" });
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    await (0, ResetPasswordService_1.default)({ token, password });
    return res.status(200).json({ message: "Password updated successfully" });
};
exports.resetPassword = resetPassword;
const verifyEmail = async (req, res) => {
    const { token } = req.params;
    const user = await (0, VerifyEmailService_1.default)(token);
    return res.status(200).json(user);
};
exports.verifyEmail = verifyEmail;
const completeRegistration = async (req, res) => {
    const { token, password } = req.body;
    const user = await (0, CompleteRegistrationService_1.default)({ token, password });
    return res.status(200).json(user);
};
exports.completeRegistration = completeRegistration;
const manualVerify = async (req, res) => {
    const { userId } = req.params;
    const user = await User_1.default.findByPk(userId);
    if (!user) {
        throw new AppError_1.default("ERR_NO_USER_FOUND", 404);
    }
    await user.update({ emailVerified: true });
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "update",
        user
    });
    return res.status(200).json(user);
};
exports.manualVerify = manualVerify;
