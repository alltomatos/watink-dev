"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const ContactCustomField_1 = __importDefault(require("../../models/ContactCustomField"));
const RabbitMQService_1 = __importDefault(require("../../services/RabbitMQService"));
const uuid_1 = require("uuid");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const logger_1 = require("../../utils/logger");
const UpdateContactService = async ({ contactData, contactId }) => {
    const { email, name, number, extraInfo } = contactData;
    const contact = await Contact_1.default.findOne({
        where: { id: contactId },
        attributes: ["id", "name", "number", "email", "profilePicUrl", "tenantId"],
        include: ["extraInfo"]
    });
    if (!contact) {
        throw new AppError_1.default("ERR_NO_CONTACT_FOUND", 404);
    }
    if (extraInfo) {
        await Promise.all(extraInfo.map(async (info) => {
            await ContactCustomField_1.default.upsert({ ...info, contactId: contact.id });
        }));
        await Promise.all(contact.extraInfo.map(async (oldInfo) => {
            const stillExists = extraInfo.findIndex(info => info.id === oldInfo.id);
            if (stillExists === -1) {
                await ContactCustomField_1.default.destroy({ where: { id: oldInfo.id } });
            }
        }));
    }
    const { email: newEmail, name: newName, number: newNumber, extraInfo: newExtraInfo, lid } = contactData;
    await contact.update({
        name: newName,
        number: newNumber,
        email: newEmail,
        lid
    });
    await contact.reload({
        attributes: ["id", "name", "number", "email", "profilePicUrl", "tenantId"],
        include: ["extraInfo"]
    });
    try {
        const tenantId = contact.tenantId || 1;
        const whatsapp = await Whatsapp_1.default.findOne({
            where: { status: "CONNECTED", tenantId }
        });
        if (whatsapp) {
            await RabbitMQService_1.default.publishCommand("wbot.global.contact.sync", {
                id: (0, uuid_1.v4)(),
                timestamp: Date.now(),
                type: "contact.sync",
                payload: {
                    contactId: contact.id,
                    number: contact.number,
                    sessionId: whatsapp.id
                },
                tenantId
            });
            logger_1.logger.info(`[UpdateContactService] Sent contact.sync command for contact ${contact.id}`);
        }
    }
    catch (err) {
        logger_1.logger.error(`[UpdateContactService] Error sending sync command: ${err}`);
    }
    return contact;
};
exports.default = UpdateContactService;
