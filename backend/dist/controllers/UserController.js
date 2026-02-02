"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
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
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { searchParam, pageNumber } = req.query;
    const { tenantId } = req.user;
    const { users, count, hasMore } = yield (0, ListUsersService_1.default)({
        searchParam,
        pageNumber,
        tenantId
    });
    return res.json({ users, count, hasMore });
});
exports.index = index;
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { email, password, name, queueIds, whatsappId, groupIds, groupId, roleIds } = req.body;
    if (req.url === "/signup" &&
        (yield (0, CheckSettings_1.default)("userCreation")) === "disabled") {
        throw new AppError_1.default("ERR_USER_CREATION_DISABLED", 403);
    }
    const user = yield (0, CreateUserService_1.default)({
        email,
        password,
        name,
        queueIds,
        whatsappId,
        groupIds,
        groupId,
        roleIds,
        tenantId: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.tenantId) || undefined
    });
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "create",
        user
    });
    return res.status(200).json(user);
});
exports.store = store;
const show = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const user = yield (0, ShowUserService_1.default)(userId);
    return res.status(200).json(user);
});
exports.show = show;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { userId } = req.params;
    const userData = req.body;
    const profileImage = (_a = req.file) === null || _a === void 0 ? void 0 : _a.filename;
    const { permissions: _ } = userData, cleanUserData = __rest(userData, ["permissions"]);
    const user = yield (0, UpdateUserService_1.default)({ userData: Object.assign(Object.assign({}, cleanUserData), { profileImage }), userId, requestUser: req.user });
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "update",
        user
    });
    return res.status(200).json(user);
});
exports.update = update;
const remove = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    yield (0, DeleteUserService_1.default)(userId, req.user);
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "delete",
        userId
    });
    return res.status(200).json({ message: "User deleted" });
});
exports.remove = remove;
const toggleStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const user = yield (0, ToggleUserStatusService_1.default)(userId);
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "update",
        user
    });
    return res.status(200).json(user);
});
exports.toggleStatus = toggleStatus;
const resendWelcomeEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    // Use the new service to send a password reset link instead of credentials
    const user = yield (0, ShowUserService_1.default)(userId);
    const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    yield (0, SendPasswordResetEmailService_1.default)(user.email, appUrl);
    return res.status(200).json({ message: "Email sent successfully" });
});
exports.resendWelcomeEmail = resendWelcomeEmail;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    yield (0, SendPasswordResetEmailService_1.default)(email, appUrl);
    return res.status(200).json({ message: "Email sent successfully" });
});
exports.forgotPassword = forgotPassword;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, password } = req.body;
    yield (0, ResetPasswordService_1.default)({ token, password });
    return res.status(200).json({ message: "Password updated successfully" });
});
exports.resetPassword = resetPassword;
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.params;
    const user = yield (0, VerifyEmailService_1.default)(token);
    return res.status(200).json(user);
});
exports.verifyEmail = verifyEmail;
const completeRegistration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, password } = req.body;
    const user = yield (0, CompleteRegistrationService_1.default)({ token, password });
    return res.status(200).json(user);
});
exports.completeRegistration = completeRegistration;
const manualVerify = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const user = yield User_1.default.findByPk(userId);
    if (!user) {
        throw new AppError_1.default("ERR_NO_USER_FOUND", 404);
    }
    yield user.update({ emailVerified: true });
    const io = (0, socket_1.getIO)();
    io.emit("user", {
        action: "update",
        user
    });
    return res.status(200).json(user);
});
exports.manualVerify = manualVerify;
