"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const RabbitMQService_1 = __importDefault(require("../../services/RabbitMQService"));
const uuid_1 = require("uuid");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const logger_1 = require("../../utils/logger");
const EntityTagService_1 = __importDefault(require("../TagServices/EntityTagService"));
const CreateOrUpdateContactService_1 = require("./CreateOrUpdateContactService");
const WhatsAppContactIdentityService_1 = require("./WhatsAppContactIdentityService");
const MergeContactsService_1 = __importDefault(require("./MergeContactsService"));
const CreateContactService = async ({ name, number, email = "", walletUserId, extraInfo = [], tenantId, waitEnrichment = false, tags }) => {
    if (!tenantId) {
        throw new AppError_1.default("Tenant ID is required for creating a contact.", 403);
    }
    const identity = (0, WhatsAppContactIdentityService_1.buildCanonicalContactIdentity)({ number });
    const matches = await (0, WhatsAppContactIdentityService_1.resolveContactsByIdentity)({
        tenantId,
        number: identity.normalizedE164 || number,
        jid: number
    });
    let contact = (0, WhatsAppContactIdentityService_1.chooseCanonicalContact)(matches);
    if (contact) {
        for (const duplicate of matches.filter(c => c.id !== contact.id)) {
            contact = await (0, MergeContactsService_1.default)({
                contactIdOrigin: duplicate.id,
                contactIdTarget: contact.id,
                tenantId
            });
        }
        await contact.update({
            name: contact.name || name,
            number: contact.number || identity.normalizedE164 || number,
            email: contact.email || email,
            walletUserId: contact.walletUserId || walletUserId || null
        });
    }
    else {
        contact = await Contact_1.default.create({
            name,
            number: identity.normalizedE164 || number,
            email,
            walletUserId,
            extraInfo,
            tenantId
        }, {
            include: ["extraInfo"]
        });
    }
    if (tags && tags.length > 0) {
        await EntityTagService_1.default.BulkApplyTags({
            tagIds: tags,
            entityType: "contact",
            entityId: contact.id,
            tenantId
        });
    }
    try {
        const whatsapp = await Whatsapp_1.default.findOne({ where: { status: "CONNECTED", tenantId } });
        if (whatsapp) {
            await RabbitMQService_1.default.publishCommand(RabbitMQService_1.default.generateRoutingKey(tenantId, whatsapp.engineType, whatsapp.id, "contact.sync"), {
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
            logger_1.logger.info(`[CreateContactService] Sent contact.sync command for contact ${contact.id}`);
            if (waitEnrichment) {
                await (0, CreateOrUpdateContactService_1.waitForContactEnrichment)(contact.id, false, tenantId);
                await contact.reload();
            }
        }
        else {
            logger_1.logger.warn(`[CreateContactService] No connected whatsapp found for tenant ${tenantId}. Skipping sync.`);
        }
    }
    catch (err) {
        logger_1.logger.error(`[CreateContactService] Error sending sync command: ${err}`);
    }
    return contact;
};
exports.default = CreateContactService;
