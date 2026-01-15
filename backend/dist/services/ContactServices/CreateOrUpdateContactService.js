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
exports.waitForContactEnrichment = void 0;
const socket_1 = require("../../libs/socket");
const Contact_1 = __importDefault(require("../../models/Contact"));
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const uuid_1 = require("uuid");
// import axios from "axios";
// import fs from "fs";
// import path, { join } from "path";
// import uploadConfig from "../../config/upload";
const DownloadProfileImage_1 = require("../../helpers/DownloadProfileImage");
const MergeContactsService_1 = __importDefault(require("./MergeContactsService"));
const logger_1 = require("../../utils/logger");
const waitForContactEnrichment = (contactId, isGroup, tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    const MAX_WAIT_MS = 5000; // 5 seconds max
    const POLLING_INTERVAL = 500;
    let waited = 0;
    logger_1.logger.info(`[Barrier] Waiting for enrichment of contact ${contactId} (Group: ${isGroup})...`);
    // Helper sleep
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    while (waited < MAX_WAIT_MS) {
        const contact = yield Contact_1.default.findByPk(contactId);
        if (!contact)
            return; // Should not happen
        let isReady = false;
        if (isGroup) {
            // Ready if has Photo AND Name is not raw number
            const hasPhoto = !!contact.profilePicUrl;
            const hasRealName = contact.name && contact.name !== contact.number;
            isReady = !!(hasPhoto && hasRealName);
        }
        else {
            // Ready if has Photo AND (Name is not number)
            const hasPhoto = !!contact.profilePicUrl;
            const hasRealName = contact.name && contact.name !== contact.number;
            isReady = !!(hasPhoto && hasRealName);
        }
        if (isReady) {
            logger_1.logger.info(`[Barrier] Contact ${contactId} enriched after ${waited}ms!`);
            return;
        }
        yield sleep(POLLING_INTERVAL);
        waited += POLLING_INTERVAL;
    }
    logger_1.logger.warn(`[Barrier] Timeout waiting for enrichment of contact ${contactId} after ${MAX_WAIT_MS}ms. Proceeding anyway.`);
});
exports.waitForContactEnrichment = waitForContactEnrichment;
const CreateOrUpdateContactService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ name, number: rawNumber, profilePicUrl, isGroup, email = "", extraInfo = [], lid, tenantId, waitEnrichment = false, sessionId }) {
    var _b, _c;
    if (!tenantId) {
        throw new Error("Tenant ID is required for CreateOrUpdateContactService");
    }
    const number = isGroup ? rawNumber : rawNumber === null || rawNumber === void 0 ? void 0 : rawNumber.replace(/[^0-9]/g, "");
    const io = (0, socket_1.getIO)();
    let contact = null;
    const backendUrl = process.env.URL_BACKEND || process.env.BACKEND_URL || "http://localhost:8080";
    // 1. Try to find by LID
    if (lid) {
        contact = yield Contact_1.default.findOne({ where: { lid, tenantId } });
    }
    // 2. Try to find by Number (only if valid number)
    let contactByNumber = null;
    if (number) {
        contactByNumber = yield Contact_1.default.findOne({ where: { number, tenantId } });
    }
    // 3. Merge Logic
    if (contact && contactByNumber) {
        if (contact.id === contactByNumber.id) {
            // Same contact found by both ways
        }
        else {
            // Merge: Prefer contactByNumber (Target), delete contact (Origin - LID-only)
            // Ensure Target has the LID
            if (!contactByNumber.lid && contact.lid) {
                yield contactByNumber.update({ lid: contact.lid });
            }
            yield (0, MergeContactsService_1.default)({
                contactIdOrigin: contact.id,
                contactIdTarget: contactByNumber.id,
                tenantId
            });
            contact = contactByNumber;
        }
    }
    else if (!contact && contactByNumber) {
        contact = contactByNumber;
    }
    // 4. Fallback: Try to find by Name (if still no contact)
    if (!contact && !number && !lid && name) {
        contact = yield Contact_1.default.findOne({ where: { name, tenantId } });
    }
    if (contact) {
        // Update existing contact
        const updates = {};
        if (lid && !contact.lid)
            updates.lid = lid;
        if (number && !contact.number)
            updates.number = number;
        // Prevent overwriting group name with JID
        if (isGroup && name) {
            const newNameIsJid = name.includes("@g.us");
            const currentNameIsJid = ((_b = contact.name) === null || _b === void 0 ? void 0 : _b.includes("@g.us")) || contact.name === contact.number;
            if (!newNameIsJid || currentNameIsJid) {
                updates.name = name;
            }
        }
        else if (name) {
            // Individual Contact: Prioritize PushName/Notify if available, OR if current name is placeholder
            // If the new name is just a number, ignore it if we already have a text name
            const newNameIsNumber = name.replace(/\D/g, "") === name || name.includes("@");
            const currentNameIsNumber = contact.name.replace(/\D/g, "") === contact.name || contact.name.includes("@");
            if (!newNameIsNumber || currentNameIsNumber) {
                updates.name = name;
            }
        }
        if (isGroup && !contact.isGroup)
            updates.isGroup = true;
        // Profile Picture logic with Download
        if (profilePicUrl && profilePicUrl !== contact.profilePicUrl) {
            const filename = yield (0, DownloadProfileImage_1.DownloadProfileImage)({
                profilePicUrl,
                tenantId,
                contactId: contact.id
            });
            if (filename) {
                // Cache busting: Add version param to force frontend update
                updates.profilePicUrl = `${backendUrl}/public/${tenantId}/contacts/${filename}?v=${new Date().getTime()}`;
            }
            else if (profilePicUrl) {
                // Fallback to remote URL if download failed
                updates.profilePicUrl = profilePicUrl;
            }
        }
        if (Object.keys(updates).length > 0) {
            yield contact.update(updates);
            yield contact.reload();
        }
        io.emit("contact", {
            action: "update",
            contact
        });
    }
    else {
        // Create new contact
        contact = yield Contact_1.default.create({
            name,
            number: number || null,
            lid: lid || null,
            profilePicUrl: "", // Will update after creation to have ID for filename
            email,
            isGroup,
            extraInfo,
            tenantId
        });
        if (profilePicUrl) {
            const filename = yield (0, DownloadProfileImage_1.DownloadProfileImage)({
                profilePicUrl,
                tenantId,
                contactId: contact.id
            });
            let finalUrl = profilePicUrl;
            if (filename) {
                // Cache busting
                finalUrl = `${backendUrl}/public/${tenantId}/contacts/${filename}?v=${new Date().getTime()}`;
            }
            yield contact.update({ profilePicUrl: finalUrl });
            yield contact.reload();
        }
        io.emit("contact", {
            action: "create",
            contact
        });
    }
    // --- BARRIER ENRICHMENT LOGIC ---
    if (waitEnrichment && sessionId && contact) {
        const shouldSync = isGroup
            ? (contact.name === contact.number || !contact.profilePicUrl)
            : (!contact.profilePicUrl || (!contact.lid && !((_c = contact.number) === null || _c === void 0 ? void 0 : _c.includes("@lid")) && !contact.name));
        if (shouldSync) {
            yield RabbitMQService_1.default.publishCommand(`wbot.${tenantId}.${sessionId}.contact.sync`, {
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
            yield (0, exports.waitForContactEnrichment)(contact.id, isGroup, tenantId);
            yield contact.reload();
        }
    }
    return contact;
});
exports.default = CreateOrUpdateContactService;
