"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLoginImage = exports.uploadFavicon = exports.uploadLogo = exports.update = exports.getPublicSettings = exports.index = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const socket_1 = require("../libs/socket");
const AppError_1 = __importDefault(require("../errors/AppError"));
const UpdateSettingService_1 = __importDefault(require("../services/SettingServices/UpdateSettingService"));
const ListSettingsService_1 = __importDefault(require("../services/SettingServices/ListSettingsService"));
const index = async (req, res) => {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { tenantId } = req.user;
    const settings = await (0, ListSettingsService_1.default)({ tenantId });
    return res.status(200).json(settings);
};
exports.index = index;
const getPublicSettings = async (req, res) => {
    const settings = await (0, ListSettingsService_1.default)();
    const publicKeys = ["systemLogo", "login_backgroundImage", "login_layout", "systemFavicon"];
    const publicSettings = (settings || []).filter(s => publicKeys.includes(s.key));
    return res.status(200).json(publicSettings);
};
exports.getPublicSettings = getPublicSettings;
const update = async (req, res) => {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { settingKey: key } = req.params;
    const { value } = req.body;
    const { tenantId } = req.user;
    const setting = await (0, UpdateSettingService_1.default)({
        key,
        value,
        tenantId
    });
    const io = (0, socket_1.getIO)();
    io.emit("settings", {
        action: "update",
        setting
    });
    return res.status(200).json(setting);
};
exports.update = update;
const uploadLogo = async (req, res) => {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    if (!req.file) {
        throw new AppError_1.default("ERR_NO_FILE_UPLOADED", 400);
    }
    const file = req.file;
    const { tenantId } = req.user; // Get tenantId
    const publicDir = path_1.default.resolve(__dirname, "..", "..", "public");
    // Create public directory if it doesn't exist
    if (!fs_1.default.existsSync(publicDir)) {
        fs_1.default.mkdirSync(publicDir, { recursive: true });
    }
    // Generate unique filename
    const ext = path_1.default.extname(file.originalname);
    const filename = `logo-${Date.now()}${ext}`;
    const filepath = path_1.default.join(publicDir, filename);
    // Move file to public directory
    fs_1.default.writeFileSync(filepath, file.buffer);
    // Build logo URL (without leading slash to avoid double slash when combined with backend URL)
    const logoUrl = `public/${filename}`;
    // Update setting
    const setting = await (0, UpdateSettingService_1.default)({
        key: "systemLogo",
        value: logoUrl,
        tenantId
    });
    const io = (0, socket_1.getIO)();
    io.emit("settings", {
        action: "update",
        setting
    });
    return res.status(200).json({ logoUrl });
};
exports.uploadLogo = uploadLogo;
const uploadFavicon = async (req, res) => {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    if (!req.file) {
        throw new AppError_1.default("ERR_NO_FILE_UPLOADED", 400);
    }
    const file = req.file;
    const { tenantId } = req.user; // Get tenantId
    const publicDir = path_1.default.resolve(__dirname, "..", "..", "public");
    if (!fs_1.default.existsSync(publicDir)) {
        fs_1.default.mkdirSync(publicDir, { recursive: true });
    }
    const ext = path_1.default.extname(file.originalname);
    const filename = `favicon-${Date.now()}${ext}`;
    const filepath = path_1.default.join(publicDir, filename);
    fs_1.default.writeFileSync(filepath, file.buffer);
    const faviconUrl = `public/${filename}`;
    const setting = await (0, UpdateSettingService_1.default)({
        key: "systemFavicon",
        value: faviconUrl,
        tenantId
    });
    const io = (0, socket_1.getIO)();
    io.emit("settings", {
        action: "update",
        setting
    });
    return res.status(200).json({ faviconUrl });
};
exports.uploadFavicon = uploadFavicon;
const uploadLoginImage = async (req, res) => {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    if (!req.file) {
        throw new AppError_1.default("ERR_NO_FILE_UPLOADED", 400);
    }
    const file = req.file;
    const { tenantId } = req.user; // Get tenantId
    const publicDir = path_1.default.resolve(__dirname, "..", "..", "public");
    if (!fs_1.default.existsSync(publicDir)) {
        fs_1.default.mkdirSync(publicDir, { recursive: true });
    }
    const ext = path_1.default.extname(file.originalname);
    const filename = `loginImage-${Date.now()}${ext}`;
    const filepath = path_1.default.join(publicDir, filename);
    fs_1.default.writeFileSync(filepath, file.buffer);
    const imageUrl = `public/${filename}`;
    const setting = await (0, UpdateSettingService_1.default)({
        key: "login_backgroundImage",
        value: imageUrl,
        tenantId
    });
    const io = (0, socket_1.getIO)();
    io.emit("settings", {
        action: "update",
        setting
    });
    return res.status(200).json({ imageUrl });
};
exports.uploadLoginImage = uploadLoginImage;
