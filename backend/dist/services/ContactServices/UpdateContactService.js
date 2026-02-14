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
const EntityTagService_1 = __importDefault(require("../TagServices/EntityTagService"));
const MergeContactsService_1 = __importDefault(require("./MergeContactsService"));
const WhatsAppContactIdentityService_1 = require("./WhatsAppContactIdentityService");
const UpdateContactService = async ({ contactData, contactId }) => {
    const { extraInfo } = contactData;
    let contact = await Contact_1.default.findOne({
        where: { id: contactId },
        attributes: ["id", "name", "number", "email", "profilePicUrl", "tenantId", "lid", "walletUserId"],
        include: ["extraInfo"]
    });
    if (!contact)
        throw new AppError_1.default("ERR_NO_CONTACT_FOUND", 404);
    const identity = (0, WhatsAppContactIdentityService_1.buildCanonicalContactIdentity)({
        lid: contactData.lid || contact.lid,
        number: contactData.number || contact.number
    });
    const identityMatches = await (0, WhatsAppContactIdentityService_1.resolveContactsByIdentity)({
        tenantId: contact.tenantId,
        lid: identity.normalizedLid,
        number: identity.normalizedE164 || contactData.number || contact.number,
        jid: contactData.number
    });
    const canonical = (0, WhatsAppContactIdentityService_1.chooseCanonicalContact)(identityMatches);
    if (canonical && canonical.id !== contact.id) {
        contact = await (0, MergeContactsService_1.default)({
            contactIdOrigin: contact.id,
            contactIdTarget: canonical.id,
            tenantId: contact.tenantId
        });
    }
    if (extraInfo) {
        await Promise.all(extraInfo.map(async (info) => ContactCustomField_1.default.upsert({ ...info, contactId: contact.id })));
        await Promise.all((contact.extraInfo || []).map(async (oldInfo) => {
            const stillExists = extraInfo.findIndex(info => info.id === oldInfo.id);
            if (stillExists === -1)
                await ContactCustomField_1.default.destroy({ where: { id: oldInfo.id } });
        }));
    }
    const { email, name, number, walletUserId, lid } = contactData;
    await contact.update({
        name,
        number: identity.normalizedE164 || number,
        email,
        walletUserId,
        lid: identity.normalizedLid || lid
    });
    if (contactData.tags) {
        await EntityTagService_1.default.SyncEntityTags({
            tagIds: contactData.tags,
            entityType: "contact",
            entityId: contact.id,
            tenantId: contact.tenantId
        });
    }
    await contact.reload({
        attributes: ["id", "name", "number", "email", "profilePicUrl", "tenantId", "lid"],
        include: ["extraInfo", "tags"]
    });
    try {
        const tenantId = contact.tenantId || 1;
        const whatsapp = await Whatsapp_1.default.findOne({ where: { status: "CONNECTED", tenantId: tenantId.toString() } });
        if (whatsapp) {
            await RabbitMQService_1.default.publishCommand(RabbitMQService_1.default.generateRoutingKey(tenantId, whatsapp.engineType, whatsapp.id, "contact.sync"), {
                id: (0, uuid_1.v4)(),
                timestamp: Date.now(),
                type: "contact.sync",
                payload: {
                    contactId: contact.id,
                    number: contact.number,
                    lid: contact.lid,
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
