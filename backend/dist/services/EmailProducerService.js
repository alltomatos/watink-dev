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
const uuid_1 = require("uuid");
const TenantSmtpSetting_1 = __importDefault(require("../models/TenantSmtpSetting"));
const CryptoHelper_1 = require("../helpers/CryptoHelper");
const RabbitMQService_1 = __importDefault(require("./RabbitMQService"));
const logger_1 = require("../utils/logger");
/**
 * Service to queue emails for sending via the Go SMTP plugin
 */
class EmailProducerService {
    /**
     * Queue an email for sending
     */
    send(_a) {
        return __awaiter(this, arguments, void 0, function* ({ tenantId, to, subject, body, isHtml = false, smtpOverride }) {
            try {
                let smtpConfig;
                if (smtpOverride) {
                    // Use provided settings (e.g. for testing)
                    smtpConfig = smtpOverride;
                }
                else {
                    // Fetch SMTP settings for tenant
                    const smtpSettings = yield TenantSmtpSetting_1.default.findOne({
                        where: { tenantId }
                    });
                    if (!smtpSettings) {
                        logger_1.logger.warn(`[EmailProducerService] No SMTP settings found for tenant ${tenantId}`);
                        return false;
                    }
                    // Decrypt password
                    let decryptedPassword;
                    try {
                        decryptedPassword = yield (0, CryptoHelper_1.decrypt)(smtpSettings.password, tenantId);
                    }
                    catch (error) {
                        logger_1.logger.error(`[EmailProducerService] Failed to decrypt SMTP password for tenant ${tenantId}`, error);
                        return false;
                    }
                    smtpConfig = {
                        host: smtpSettings.host,
                        port: smtpSettings.port,
                        user: smtpSettings.user,
                        password: decryptedPassword,
                        secure: smtpSettings.secure,
                        emailFrom: smtpSettings.emailFrom
                    };
                }
                // Build payload
                const payload = {
                    smtp: smtpConfig,
                    email: {
                        to,
                        subject,
                        body,
                        isHtml
                    }
                };
                // Create envelope for RabbitMQ
                const envelope = {
                    id: (0, uuid_1.v4)(),
                    timestamp: Date.now(),
                    tenantId,
                    type: "email.send",
                    payload
                };
                // Publish to email_events queue
                yield RabbitMQService_1.default.publishCommand("email.send", envelope);
                logger_1.logger.info(`[EmailProducerService] Email queued for ${to} (tenant: ${tenantId})`);
                return true;
            }
            catch (error) {
                logger_1.logger.error(`[EmailProducerService] Failed to queue email`, error);
                return false;
            }
        });
    }
}
exports.default = new EmailProducerService();
