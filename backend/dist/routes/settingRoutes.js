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
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const SettingController = __importStar(require("../controllers/SettingController"));
const settingRoutes = (0, express_1.Router)();
// Configure multer for memory storage
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
settingRoutes.get("/settings", isAuth_1.default, SettingController.index);
settingRoutes.get("/public-settings", SettingController.getPublicSettings); // [NEW] Public route
// routes.get("/settings/:settingKey", isAuth, SettingsController.show);
// change setting key to key in future
settingRoutes.put("/settings/:settingKey", isAuth_1.default, SettingController.update);
// Logo upload route
settingRoutes.post("/settings/logo", isAuth_1.default, upload.single("logo"), SettingController.uploadLogo);
// Favicon upload route
settingRoutes.post("/settings/favicon", isAuth_1.default, upload.single("favicon"), SettingController.uploadFavicon);
// Login Image upload route
settingRoutes.post("/settings/loginImage", isAuth_1.default, upload.single("loginImage"), SettingController.uploadLoginImage);
exports.default = settingRoutes;
