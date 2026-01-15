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
exports.DownloadProfileImage = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importStar(require("path"));
const upload_1 = __importDefault(require("../config/upload"));
const logger_1 = require("../utils/logger");
const DownloadProfileImage = (_a) => __awaiter(void 0, [_a], void 0, function* ({ profilePicUrl, tenantId, contactId }) {
    const publicFolder = upload_1.default.directory;
    let filename = "";
    const folder = path_1.default.join(publicFolder, String(tenantId), "contacts");
    if (!fs_1.default.existsSync(folder)) {
        fs_1.default.mkdirSync(folder, { recursive: true });
    }
    // If already local or special placeholder, return empty
    if (!profilePicUrl || profilePicUrl.includes("/public/") || profilePicUrl.endsWith("nopicture.png")) {
        return "";
    }
    // Filename pattern: ${contact_id}_profile.jpg
    filename = `${contactId}_profile.jpg`;
    const filePath = (0, path_1.join)(folder, filename);
    const maxAttempts = 3;
    let attempt = 0;
    logger_1.logger.info(`[DownloadProfileImage] Downloading new image for contact ${contactId}...`);
    while (attempt < maxAttempts) {
        try {
            const response = yield axios_1.default.get(profilePicUrl, {
                responseType: "arraybuffer",
                timeout: 10000
            });
            // Process image with sharp if available, else save directly
            try {
                const sharp = require("sharp");
                yield sharp(response.data)
                    .resize(500, 500, {
                    fit: 'inside', // Maintain aspect ratio, max 500x500
                    withoutEnlargement: true // Don't upscale if smaller
                })
                    .jpeg({
                    quality: 80,
                    mozjpeg: true
                })
                    .toFile(filePath);
            }
            catch (err) {
                if (err.code === 'MODULE_NOT_FOUND') {
                    logger_1.logger.warn(`[DownloadProfileImage] Sharp module not found. Saving image directly without processing.`);
                    fs_1.default.writeFileSync(filePath, response.data);
                }
                else {
                    throw err;
                }
            }
            logger_1.logger.info(`[DownloadProfileImage] Successfully downloaded and processed image for contact ${contactId} to ${filename}`);
            return filename;
        }
        catch (error) {
            logger_1.logger.error(`[DownloadProfileImage] Failed attempt ${attempt + 1} for contact ${contactId}: ${error}`);
            attempt++;
            yield new Promise(r => setTimeout(r, 1000));
        }
    }
    return "";
});
exports.DownloadProfileImage = DownloadProfileImage;
