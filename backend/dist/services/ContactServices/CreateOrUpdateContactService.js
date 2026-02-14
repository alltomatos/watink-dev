"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForContactEnrichment = void 0;
const socket_1 = require("../../libs/socket");
const Contact_1 = __importDefault(require("../../models/Contact"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const uuid_1 = require("uuid");
const DownloadProfileImage_1 = require("../../helpers/DownloadProfileImage");
const MergeContactsService_1 = __importDefault(require("./MergeContactsService"));
const logger_1 = require("../../utils/logger");
const WhatsAppContactIdentityService_1 = require("./WhatsAppContactIdentityService");
const waitForContactEnrichment = async (contactId, isGroup, tenantId) => {
    const MAX_WAIT_MS = 5000;
    const POLLING_INTERVAL = 500;
    let waited = 0;
    logger_1.logger.info(`[Barrier] Waiting for enrichment of contact ${contactId} (Group: ${isGroup})...`);
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    while (waited < MAX_WAIT_MS) {
        const contact = await Contact_1.default.findByPk(contactId);
        if (!contact)
            return;
        const hasPhoto = !!contact.profilePicUrl;
        const hasRealName = contact.name && contact.name !== contact.number;
        const isReady = !!(hasPhoto && hasRealName);
        if (isReady) {
            logger_1.logger.info(`[Barrier] Contact ${contactId} enriched after ${waited}ms!`);
            return;
        }
        await sleep(POLLING_INTERVAL);
        waited += POLLING_INTERVAL;
    }
    logger_1.logger.warn(`[Barrier] Timeout waiting for enrichment of contact ${contactId} after ${MAX_WAIT_MS}ms. Proceeding anyway.`);
};
exports.waitForContactEnrichment = waitForContactEnrichment;
const CreateOrUpdateContactService = async ({ name, number: rawNumber, profilePicUrl, isGroup, email = "", extraInfo = [], lid, tenantId, waitEnrichment = false, sessionId }) => {
    if (!tenantId) {
        throw new Error("Tenant ID is required for CreateOrUpdateContactService");
    }
    const io = (0, socket_1.getIO)();
    const backendUrl = process.env.URL_BACKEND || process.env.BACKEND_URL || "http://localhost:8080";
    const identity = (0, WhatsAppContactIdentityService_1.buildCanonicalContactIdentity)({ lid, number: rawNumber, jid: rawNumber });
    let contact = null;
    const matches = await (0, WhatsAppContactIdentityService_1.resolveContactsByIdentity)({
        tenantId,
        lid: identity.normalizedLid,
        number: identity.normalizedE164 || rawNumber,
        jid: identity.normalizedJid
    });
    if (matches.length > 0) {
        contact = (0, WhatsAppContactIdentityService_1.chooseCanonicalContact)(matches);
        if (contact) {
            const duplicates = matches.filter(c => c.id !== contact.id);
            for (const duplicate of duplicates) {
                contact = await (0, MergeContactsService_1.default)({
                    contactIdOrigin: duplicate.id,
                    contactIdTarget: contact.id,
                    tenantId
                });
            }
        }
    }
    if (contact) {
        const updates = {};
        if (identity.normalizedLid && !contact.lid)
            updates.lid = identity.normalizedLid;
        if (identity.normalizedE164 && !contact.number)
            updates.number = identity.normalizedE164;
        if (isGroup && name) {
            const newNameIsJid = name.includes("@g.us");
            const currentNameIsJid = contact.name?.includes("@g.us") || contact.name === contact.number;
            if (!newNameIsJid || currentNameIsJid)
                updates.name = name;
        }
        else if (name) {
            const newNameIsNumber = name.replace(/\D/g, "") === name || name.includes("@");
            const currentNameIsNumber = contact.name?.replace(/\D/g, "") === contact.name || contact.name?.includes("@");
            if (!newNameIsNumber || currentNameIsNumber)
                updates.name = name;
        }
        if (isGroup && !contact.isGroup)
            updates.isGroup = true;
        if (profilePicUrl && profilePicUrl !== contact.profilePicUrl) {
            const filename = await (0, DownloadProfileImage_1.DownloadProfileImage)({ profilePicUrl, tenantId, contactId: contact.id });
            updates.profilePicUrl = filename
                ? `${backendUrl}/public/${tenantId}/contacts/${filename}?v=${new Date().getTime()}`
                : profilePicUrl;
        }
        if (Object.keys(updates).length > 0) {
            await contact.update(updates);
            await contact.reload();
        }
        io.emit("contact", { action: "update", contact });
    }
    else {
        contact = await Contact_1.default.create({
            name,
            number: identity.normalizedE164 || null,
            lid: identity.normalizedLid || null,
            profilePicUrl: "",
            email,
            isGroup,
            extraInfo,
            tenantId
        });
        if (profilePicUrl) {
            const filename = await (0, DownloadProfileImage_1.DownloadProfileImage)({ profilePicUrl, tenantId, contactId: contact.id });
            const finalUrl = filename
                ? `${backendUrl}/public/${tenantId}/contacts/${filename}?v=${new Date().getTime()}`
                : profilePicUrl;
            await contact.update({ profilePicUrl: finalUrl });
            await contact.reload();
        }
        io.emit("contact", { action: "create", contact });
    }
    if (waitEnrichment && sessionId && contact) {
        const shouldSync = isGroup
            ? (contact.name === contact.number || !contact.profilePicUrl)
            : (!contact.profilePicUrl || (!contact.lid && !contact.number?.includes("@lid") && !contact.name));
        if (shouldSync) {
            const whatsapp = await Whatsapp_1.default.findByPk(sessionId);
            if (whatsapp) {
                await RabbitMQService_1.default.publishCommand(RabbitMQService_1.default.generateRoutingKey(tenantId, whatsapp.engineType, sessionId, "contact.sync"), {
                    id: (0, uuid_1.v4)(),
                    timestamp: Date.now(),
                    tenantId,
                    type: "contact.sync",
                    payload: {
                        sessionId,
                        contactId: contact.id,
                        number: contact.number,
                        lid: contact.lid || undefined,
                        isGroup
                    }
                });
                await (0, exports.waitForContactEnrichment)(contact.id, isGroup, tenantId);
                await contact.reload();
            }
        }
    }
    return contact;
};
exports.default = CreateOrUpdateContactService;
