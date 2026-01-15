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
exports.test = exports.store = exports.index = void 0;
const AppError_1 = __importDefault(require("../errors/AppError"));
const TenantSmtpSetting_1 = __importDefault(require("../models/TenantSmtpSetting"));
const CryptoHelper_1 = require("../helpers/CryptoHelper");
const EmailProducerService_1 = __importDefault(require("../services/EmailProducerService"));
const logger_1 = require("../utils/logger");
/**
 * List SMTP settings for the current tenant
 */
const index = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { tenantId } = req.user;
    const settings = yield TenantSmtpSetting_1.default.findOne({
        where: { tenantId },
        attributes: { exclude: ["password"] } // Never return password
    });
    if (!settings) {
        return res.status(200).json(null);
    }
    // Return settings with masked password indicator
    return res.status(200).json(Object.assign(Object.assign({}, settings.toJSON()), { hasPassword: true }));
});
exports.index = index;
/**
 * Create or update SMTP settings for the current tenant
 */
const store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { tenantId } = req.user;
    const { host, port, user, password, secure, emailFrom } = req.body;
    if (!host || !port || !user || !emailFrom) {
        throw new AppError_1.default("ERR_MISSING_REQUIRED_FIELDS", 400);
    }
    let existingSettings = yield TenantSmtpSetting_1.default.findOne({
        where: { tenantId }
    });
    // Encrypt password if provided
    let encryptedPassword = existingSettings === null || existingSettings === void 0 ? void 0 : existingSettings.password;
    if (password && password.trim() !== "") {
        encryptedPassword = yield (0, CryptoHelper_1.encrypt)(password, tenantId);
    }
    if (!encryptedPassword) {
        throw new AppError_1.default("ERR_PASSWORD_REQUIRED", 400);
    }
    if (existingSettings) {
        // Update existing
        yield existingSettings.update({
            host,
            port: Number(port) || 587,
            user,
            password: encryptedPassword,
            secure: Boolean(secure),
            emailFrom
        });
    }
    else {
        // Create new
        existingSettings = yield TenantSmtpSetting_1.default.create({
            tenantId,
            host,
            port: Number(port) || 587,
            user,
            password: encryptedPassword,
            secure: Boolean(secure),
            emailFrom
        });
    }
    return res.status(200).json({
        id: existingSettings.id,
        host: existingSettings.host,
        port: existingSettings.port,
        user: existingSettings.user,
        secure: existingSettings.secure,
        emailFrom: existingSettings.emailFrom,
        hasPassword: true
    });
});
exports.store = store;
/**
 * Test SMTP connection by sending a real test email
 */
const test = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { tenantId } = req.user;
    const { host, port, user, password, secure, emailFrom, testEmail } = req.body;
    if (!testEmail || !testEmail.trim()) {
        throw new AppError_1.default("ERR_TEST_EMAIL_REQUIRED", 400);
    }
    // Determine password to use (decrypted existing or new one provided)
    let testPassword = password;
    if (!testPassword || testPassword.trim() === "") {
        const existingSettings = yield TenantSmtpSetting_1.default.findOne({
            where: { tenantId }
        });
        if (existingSettings === null || existingSettings === void 0 ? void 0 : existingSettings.password) {
            testPassword = yield (0, CryptoHelper_1.decrypt)(existingSettings.password, tenantId);
        }
    }
    if (!host || !port || !user || !testPassword) {
        throw new AppError_1.default("ERR_MISSING_REQUIRED_FIELDS", 400);
    }
    try {
        // Queue the email via EmailProducerService (which sends to RabbitMQ -> Go Plugin)
        const success = yield EmailProducerService_1.default.send({
            tenantId,
            to: testEmail,
            subject: "Teste de Configuração SMTP - Watink",
            body: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #4caf50; text-align: center;">Parabéns! 🎉</h2>
                <p style="font-size: 16px; color: #333;">Se você está vendo esta mensagem, significa que você configurou corretamente o envio de e-mails do seu <strong>Watink</strong>.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0; color: #555;">🚀 <strong>Agora o sistema pode enviar notificações e e-mails automaticamente.</strong></p>
                    <p style="margin: 5px 0 0 0; color: #777; font-size: 14px;">(Processado pelo Plugin Watink SMTP)</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                    Enviado via <strong>${host}:${port}</strong> • ${Boolean(secure) ? "Seguro (SSL/TLS)" : "Não Seguro"}
                </p>
            </div>
            `,
            isHtml: true,
            smtpOverride: {
                host,
                port: Number(port),
                user,
                password: testPassword,
                secure: Boolean(secure),
                emailFrom: emailFrom || user
            }
        });
        if (success) {
            return res.status(200).json({
                success: true,
                message: `E-mail de teste enviado para a fila de processamento! A entrega será feita pelo Plugin SMTP. Verifique sua caixa ${testEmail} e os logs do plugin.`
            });
        }
        else {
            throw new Error("Falha ao enfileirar e-mail de teste.");
        }
    }
    catch (err) {
        logger_1.logger.error("Error sending test email:", err);
        return res.status(500).json({ success: false, message: "Erro ao enfileirar teste: " + err.message });
    }
});
exports.test = test;
