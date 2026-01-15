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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearKeyCache = clearKeyCache;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const Setting_1 = __importDefault(require("../models/Setting"));
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SETTING_KEY = "smtp_encryption_key";
// Cache the key in memory to avoid repeated DB queries
let cachedKey = null;
/**
 * Generates a random 32-byte key and returns it as hex string.
 */
function generateRandomKey() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
/**
 * Gets or creates the encryption key from database.
 * Key is stored in Settings table with key "smtp_encryption_key".
 * Generated automatically on first use.
 */
function getKey(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (cachedKey) {
            return cachedKey;
        }
        // Try to find existing key in database
        let setting = yield Setting_1.default.findOne({
            where: { key: SETTING_KEY, tenantId }
        });
        if (!setting) {
            // Generate new random key and store it
            const newKey = generateRandomKey();
            setting = yield Setting_1.default.create({
                key: SETTING_KEY,
                value: newKey,
                tenantId
            });
        }
        const keyHex = setting.value;
        // Key should be 64 hex chars (32 bytes)
        if (keyHex.length === 64) {
            cachedKey = Buffer.from(keyHex, "hex");
        }
        else {
            // Hash it to get 32 bytes if not proper format
            cachedKey = crypto_1.default.createHash("sha256").update(keyHex).digest();
        }
        return cachedKey;
    });
}
/**
 * Clears the cached key (useful for testing or tenant changes).
 */
function clearKeyCache() {
    cachedKey = null;
}
/**
 * Encrypts a text string using AES-256-GCM.
 * Returns format: iv:authTag:encryptedData (all base64)
 */
function encrypt(text, tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = yield getKey(tenantId);
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, "utf8", "base64");
        encrypted += cipher.final("base64");
        const authTag = cipher.getAuthTag();
        return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
    });
}
/**
 * Decrypts a string encrypted with the encrypt function.
 * Expects format: iv:authTag:encryptedData (all base64)
 */
function decrypt(encryptedText, tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = yield getKey(tenantId);
        const parts = encryptedText.split(":");
        if (parts.length !== 3) {
            throw new Error("Invalid encrypted text format");
        }
        const iv = Buffer.from(parts[0], "base64");
        const authTag = Buffer.from(parts[1], "base64");
        const encrypted = parts[2];
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, "base64", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    });
}
exports.default = { encrypt, decrypt, clearKeyCache };
