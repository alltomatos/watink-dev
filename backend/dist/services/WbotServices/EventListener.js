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
exports.EventListener = void 0;
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const logger_1 = require("../../utils/logger");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const socket_1 = require("../../libs/socket");
const FindOrCreateTicketService_1 = __importDefault(require("../TicketServices/FindOrCreateTicketService"));
const CreateMessageService_1 = __importDefault(require("../MessageServices/CreateMessageService"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Message_1 = __importDefault(require("../../models/Message"));
const CreateOrUpdateContactService_1 = __importDefault(require("../ContactServices/CreateOrUpdateContactService"));
const DownloadProfileImage_1 = require("../../helpers/DownloadProfileImage");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const getSessionId = (sessionId) => {
    return parseInt(String(sessionId).split("-")[0], 10);
};
const EventListener = () => __awaiter(void 0, void 0, void 0, function* () {
    const routingKeys = [
        "wbot.*.*.session.qrcode",
        "wbot.*.*.session.pairingcode",
        "wbot.*.*.session.status",
        "wbot.*.*.message.received",
        "wbot.*.*.message.reaction",
        "wbot.*.*.message.reaction",
        "wbot.*.*.contact.update",
        "wbot.*.*.message.ack",
        "wbot.*.*.message.revoke"
    ];
    yield RabbitMQService_1.default.consumeEvents("api.events.process", routingKeys, (msg) => __awaiter(void 0, void 0, void 0, function* () {
        logger_1.logger.info(`Event received: ${msg.type}`);
        switch (msg.type) {
            case "session.qrcode":
                yield handleQrCode(msg.payload);
                break;
            case "session.pairingcode":
                yield handlePairingCode(msg.payload);
                break;
            case "session.status":
                yield handleSessionStatus(msg.payload);
                break;
            case "message.received":
                yield handleMessageReceived(msg.payload, msg.tenantId);
                break;
            case "message.reaction":
                yield handleMessageReaction(msg.payload, msg.tenantId);
                break;
            case "contact.update":
                yield handleContactUpdate(msg.payload, msg.tenantId);
                break;
            case "message.ack":
                yield handleMessageAck(msg.payload, msg.tenantId);
                break;
            case "message.revoke":
                yield handleMessageRevoke(msg.payload, msg.tenantId);
                break;
            default:
                logger_1.logger.warn(`Unknown event type: ${msg.type}`);
        }
    }));
});
exports.EventListener = EventListener;
const handleQrCode = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const io = (0, socket_1.getIO)();
    yield Whatsapp_1.default.update({ qrcode: payload.qrcode, status: "QRCODE" }, { where: { id: getSessionId(payload.sessionId) } });
    io.emit(`whatsappSession`, {
        action: "update",
        session: { id: getSessionId(payload.sessionId), qrcode: payload.qrcode, status: "QRCODE" }
    });
});
const handlePairingCode = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const io = (0, socket_1.getIO)();
    io.emit(`whatsappSession`, {
        action: "update",
        session: { id: getSessionId(payload.sessionId), pairingCode: payload.pairingCode, status: "PAIRING" }
    });
});
const RedisService_1 = require("../RedisService");
const handleSessionStatus = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const io = (0, socket_1.getIO)();
    const updateData = { status: payload.status, qrcode: "" };
    if (payload.number)
        updateData.number = payload.number;
    if (payload.profilePicUrl)
        updateData.profilePicUrl = payload.profilePicUrl;
    yield Whatsapp_1.default.update(updateData, { where: { id: getSessionId(payload.sessionId) } });
    // REDIS CACHE IMPLEMENTATION
    try {
        const redis = RedisService_1.RedisService.getInstance();
        const statusKey = `session:status:${getSessionId(payload.sessionId)}`;
        // Cache the status payload for quick retrieval
        // We store the full payload or just the status string? 
        // Plan said "session:status:{id} exists and has correct value"
        // Let's store a simple JSON object
        yield redis.setValue(statusKey, JSON.stringify({
            status: payload.status,
            number: payload.number,
            profilePicUrl: payload.profilePicUrl,
            updatedAt: Date.now()
        }));
    }
    catch (err) {
        logger_1.logger.error(`Failed to cache session status in Redis: ${err}`);
    }
    io.emit(`whatsappSession`, {
        action: "update",
        session: {
            id: getSessionId(payload.sessionId),
            status: payload.status,
            number: payload.number,
            profilePicUrl: payload.profilePicUrl
        }
    });
});
const MergeContactsService_1 = __importDefault(require("../ContactServices/MergeContactsService"));
const sequelize_1 = require("sequelize");
// ... previous imports
const handleContactUpdate = (payload, tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.info(`[EventListener] Received contact.update for ${payload.number} (ID: ${payload.contactId})`);
    const { contactId, number, profilePicUrl, pushName, lid, isGroup, sessionId } = payload;
    if (!tenantId && sessionId) {
        const whatsapp = yield Whatsapp_1.default.findByPk(getSessionId(sessionId));
        if (whatsapp) {
            tenantId = whatsapp.tenantId;
        }
    }
    const backendUrl = process.env.URL_BACKEND || process.env.BACKEND_URL || "http://localhost:8080";
    let contact = null;
    if (contactId) {
        contact = yield Contact_1.default.findByPk(contactId);
    }
    // If no contact found by ID (or no ID provided), try to find by LID or Number
    if (!contact) {
        if (lid) {
            contact = yield Contact_1.default.findOne({ where: { lid, tenantId } });
        }
        if (!contact && number) {
            // Try finding by basic number or remoteJid equivalent
            contact = yield Contact_1.default.findOne({
                where: {
                    [sequelize_1.Op.or]: [
                        { number: number }
                    ],
                    tenantId
                }
            });
        }
    }
    if (contact) {
        // 1. Check for LID Duplication/Collision
        if (lid && contact.lid && lid !== contact.lid) {
            const duplicate = yield Contact_1.default.findOne({
                where: {
                    lid: lid,
                    tenantId: contact.tenantId, // Use contact's tenant to be safe
                    id: { [sequelize_1.Op.ne]: contact.id } // exclude self
                }
            });
            if (duplicate) {
                logger_1.logger.info(`[EventListener] LID collision detected: ${lid}. Merging ${contact.id} into ${duplicate.id}`);
                yield (0, MergeContactsService_1.default)({
                    contactIdOrigin: contact.id,
                    contactIdTarget: duplicate.id,
                    tenantId: contact.tenantId
                });
                // After merge, the origin contact is destroyed. We stop here.
                return;
            }
        }
        // 2. Normal Update
        const updates = {};
        if (profilePicUrl) {
            const filename = yield (0, DownloadProfileImage_1.DownloadProfileImage)({
                profilePicUrl,
                tenantId,
                contactId: contact.id
            });
            if (filename) {
                // Cache busting
                updates.profilePicUrl = `${backendUrl}/public/${tenantId}/contacts/${filename}?v=${new Date().getTime()}`;
            }
            else {
                updates.profilePicUrl = profilePicUrl;
            }
        }
        if (lid)
            updates.lid = lid;
        if (pushName)
            updates.name = pushName; // Optionally update name if available
        if (Object.keys(updates).length > 0) {
            yield contact.update(updates);
            const io = (0, socket_1.getIO)();
            io.emit("contact", {
                action: "update",
                contact
            });
        }
    }
    else {
        // Optional: Create contact if it doesn't exist? 
        // For now, we only update existing contacts to avoid polluting DB with random group updates if the user isn't interacting with them.
        // However, for groups we are part of, we probably want them? 
        // Let's stick to updating existing ones for now to be safe.
    }
});
const handleMessageReceived = (payload, tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { message, sessionId } = payload;
    if (message.from === "status@broadcast") {
        return;
    }
    logger_1.logger.info(`[EventListener] handleMessageReceived: ${JSON.stringify(payload)}`);
    const whatsapp = yield Whatsapp_1.default.findByPk(getSessionId(sessionId));
    if (!whatsapp)
        return;
    if (!tenantId && whatsapp.tenantId) {
        tenantId = whatsapp.tenantId;
    }
    if (!tenantId) {
        logger_1.logger.error(`[EventListener] handleMessageReceived: Tenant ID is missing for session ${sessionId}`);
        return;
    }
    // Deduplication handling for Optimistic UI
    // If we receive 'originalId', it means this message corresponds to a pending message (UUID) created by Backend.
    // We must DELETE the pending message so the new one (WA ID) can replace it in the frontend.
    let preservedBody = null;
    let preservedMediaUrl = null;
    let preservedMediaType = null;
    let preservedCreatedAt = null;
    if (message.originalId) {
        if (message.originalId === message.id) {
            logger_1.logger.info(`[EventListener] handleMessageReceived - Deduping: IDs match (${message.id}). Skipping destruction.`);
            const existingMsg = yield Message_1.default.findByPk(message.id);
            if (existingMsg) {
                preservedBody = existingMsg.body;
                preservedMediaUrl = existingMsg.getDataValue("mediaUrl");
                preservedMediaType = existingMsg.mediaType;
                preservedCreatedAt = existingMsg.createdAt;
            }
        }
        else {
            logger_1.logger.info(`[EventListener] handleMessageReceived - Deduping: Found originalId ${message.originalId}. Processing replacement.`);
            try {
                const pendingMessage = yield Message_1.default.findByPk(message.originalId);
                if (pendingMessage) {
                    // PRESERVE: Capture data from pending message before destroying
                    preservedBody = pendingMessage.body;
                    preservedMediaUrl = pendingMessage.getDataValue("mediaUrl");
                    preservedMediaType = pendingMessage.mediaType;
                    preservedCreatedAt = pendingMessage.createdAt;
                    yield pendingMessage.destroy();
                    logger_1.logger.info(`[EventListener] Pending message ${message.originalId} destroyed successfully.`);
                    // Emit deletion event to frontend to remove the clock icon
                    const io = (0, socket_1.getIO)();
                    io.to(pendingMessage.ticketId.toString()).emit(`appMessage`, {
                        action: "delete",
                        messageId: message.originalId
                    });
                }
                else {
                    logger_1.logger.warn(`[EventListener] Pending message ${message.originalId} not found in DB.`);
                }
            }
            catch (dedupeErr) {
                logger_1.logger.error(`[EventListener] Error deleting pending message ${message.originalId}: ${dedupeErr}`);
            }
        }
    }
    let groupContact;
    let msgContact;
    if (message.isGroup) {
        // 1. Group Contact (Ticket Owner)
        const groupData = {
            name: message.from, // TODO: Fetch real group subject if possible
            number: message.from.replace(/\D/g, ""),
            isGroup: true,
            tenantId
        };
        // We don't want to overwrite the group name with JID if it already exists and has a name
        // CreateOrUpdateContactService overwrites name. Ideally we should check this.
        // For now, passing message.from as name is standard behavior if name not known.
        groupData.waitEnrichment = true;
        groupData.sessionId = sessionId;
        groupContact = yield (0, CreateOrUpdateContactService_1.default)(groupData);
        // 2. Participant Contact (Sender)
        const participant = message.participant || "";
        // Logging diagnostic for missing participant
        if (!participant) {
            logger_1.logger.error(`Group message ${message.id} from ${message.from} has NO participant! PushName: ${message.pushName}`);
        }
        const participantNumber = participant.replace(/\D/g, "");
        // Check if we already have this participant as a contact
        let savedParticipant = yield Contact_1.default.findOne({
            where: {
                number: participantNumber,
                tenantId
            }
        });
        if (savedParticipant) {
            msgContact = savedParticipant;
        }
        else {
            // DOES NOT EXIST: Treat as Group Contact for the purpose of Ticket/Message linking context
            // We do NOT create a contact for them to avoid pollution.
            msgContact = groupContact;
        }
    }
    else {
        // Individual Contact
        const isLid = message.from.includes("@lid");
        const number = message.from.replace(/\D/g, "");
        const providedLid = message.senderLid;
        const contactData = {
            number: providedLid ? number : (isLid ? null : (number || null)),
            lid: providedLid || (isLid ? message.from : undefined),
            isGroup: false,
            tenantId,
            waitEnrichment: true,
            sessionId
        };
        // Only update name and pfp if message is NOT from me (incoming)
        if (!message.fromMe) {
            contactData.name = message.pushName || message.from;
            contactData.profilePicUrl = message.profilePicUrl;
        }
        else {
            // If fromMe, use the number/address as name just for creation if it doesn't exist
            contactData.name = message.from;
        }
        msgContact = yield (0, CreateOrUpdateContactService_1.default)(contactData);
    }
    // FIX: Se a mensagem veio com timestamp inválido (0) mas temos a data original de criação, restauramos.
    if (preservedCreatedAt && (!message.timestamp || message.timestamp * 1000 < 1577836800000)) { // < 2020
        logger_1.logger.warn(`[EventListener] Timestamp fixed for msg ${message.id}: ${message.timestamp} -> ${preservedCreatedAt}`);
        message.timestamp = Math.floor(preservedCreatedAt.getTime() / 1000);
    }
    // --- NOVA LÓGICA DE FILTRO DE TICKET ---
    // 1. Validar Timestamp
    const hasValidTimestamp = message.timestamp && message.timestamp * 1000 > 1577836800000;
    // 2. Calcular idade da mensagem
    // Se não tem timestamp válido e não foi preservado (pendente), assumimos que é MUITO antiga/inválida.
    // Se tem timestamp, verificamos se é maior que 24 horas.
    const isOldMessage = !preservedCreatedAt && (!hasValidTimestamp ||
        (Date.now() - (message.timestamp * 1000) > 1000 * 60 * 60 * 24) // 24 hours
    );
    // Lógica de Fuso Horário (opcional para logs ou futuro ajuste fino)
    // const timezoneSetting = await Setting.findOne({ where: { key: "timezone", tenantId } });
    // const timezone = timezoneSetting?.value || "America/Sao_Paulo";
    // Mensagens históricas (ou sem data) não criam ticket novo
    if (isOldMessage) {
        logger_1.logger.info(`[EventListener] Old/Historic message detected (${message.id}). Timestamp: ${message.timestamp}. Archiving without opening ticket.`);
        let ticketForMessage = yield Ticket_1.default.findOne({
            where: {
                contactId: (groupContact || msgContact).id,
                whatsappId: whatsapp.id,
                tenantId
            },
            order: [["updatedAt", "DESC"]]
        });
        if (!ticketForMessage) {
            logger_1.logger.info(`[EventListener] Old message ${message.id} has no ticket. Creating USED closed ticket to save history.`);
            ticketForMessage = yield Ticket_1.default.create({
                contactId: groupContact ? groupContact.id : msgContact.id,
                status: "closed",
                isGroup: !!groupContact,
                unreadMessages: 0,
                whatsappId: whatsapp.id,
                tenantId
            });
        }
        if (ticketForMessage) {
            if (ticketForMessage.status === "open" || ticketForMessage.status === "pending") {
                // Se já existe ticket aberto, salvamos nele sem problemas.
                logger_1.logger.info(`[EventListener] Check: Message ${message.id} is old, but ticket ${ticketForMessage.id} is ${ticketForMessage.status}. appending...`);
            }
            else {
                logger_1.logger.info(`[EventListener] Saving old message ${message.id} to CLOSED ticket ${ticketForMessage.id}.`);
            }
            const msgDataVal = {
                id: message.id,
                ticketId: ticketForMessage.id,
                contactId: msgContact.id,
                body: preservedBody || message.body,
                fromMe: message.fromMe,
                read: true, // Mensagens antigas são marcadas como lidas
                mediaType: preservedMediaType || message.type,
                mediaUrl: preservedMediaUrl || message.mediaUrl,
                timestamp: hasValidTimestamp ? message.timestamp * 1000 : new Date().getTime(), // Fallback to now if invalid just for DB constaint, but logic handled it
                createdAt: hasValidTimestamp ? new Date(message.timestamp * 1000) : new Date(),
                participant: message.participant,
                dataJson: message,
                quotedMsgId: message.quotedMsgId,
                ack: 3, // Mensagens antigas assumem ACK = read
                tenantId
            };
            // Processar mídia se houver
            if (message.hasMedia && message.mediaData && !preservedMediaUrl) {
                try {
                    const { join } = require("path");
                    const { writeFile } = require("fs").promises;
                    const uploadConfig = require("../../config/upload").default;
                    const mimetype = message.mimetype || "";
                    const ext = ((_a = mimetype.split("/")[1]) === null || _a === void 0 ? void 0 : _a.split(";")[0]) || "bin";
                    const filename = `${new Date().getTime()}-${message.id}.${ext}`;
                    const tenantFolder = join(uploadConfig.directory, tenantId.toString());
                    if (!require("fs").existsSync(tenantFolder)) {
                        require("fs").mkdirSync(tenantFolder, { recursive: true });
                    }
                    const filePath = join(tenantFolder, filename);
                    const buffer = Buffer.from(message.mediaData, "base64");
                    yield writeFile(filePath, buffer);
                    msgDataVal.mediaUrl = `${tenantId}/${filename}`;
                    if (message.type === "media") {
                        if (mimetype.startsWith("image/"))
                            msgDataVal.mediaType = "image";
                        else if (mimetype.startsWith("video/"))
                            msgDataVal.mediaType = "video";
                        else if (mimetype.startsWith("audio/"))
                            msgDataVal.mediaType = "audio";
                        else
                            msgDataVal.mediaType = "document";
                    }
                }
                catch (err) {
                    logger_1.logger.error(`Error saving media for old message ${message.id}: ${err}`);
                }
            }
            yield (0, CreateMessageService_1.default)({ messageData: msgDataVal });
        }
        return; // Stop here, do not create pending ticket
    }
    // Apenas para mensagens NOVAS - criar ticket pending
    const ticket = yield (0, FindOrCreateTicketService_1.default)(groupContact || msgContact, whatsapp.id, 1, // Unread messages
    tenantId, groupContact);
    let creationDate = new Date(message.timestamp * 1000);
    // FIX: Prioritize preservedCreatedAt to avoid message jumping in Optimistic UI
    if (preservedCreatedAt) {
        creationDate = preservedCreatedAt;
        logger_1.logger.info(`[EventListener] Restoring preserved createdAt for message ${message.id}: ${creationDate}`);
    }
    else {
        // If no preserved timestamp, check for invalid dates (1970)
        if (creationDate.getFullYear() < 2020) {
            creationDate = new Date();
            logger_1.logger.info(`[EventListener] Invalid timestamp ${message.timestamp}. using NOW: ${creationDate}`);
        }
    }
    const msgData = {
        id: message.id,
        ticketId: ticket.id,
        contactId: msgContact.id,
        body: preservedBody || message.body,
        fromMe: message.fromMe,
        read: message.fromMe || false,
        mediaType: preservedMediaType || message.type,
        mediaUrl: preservedMediaUrl || message.mediaUrl,
        timestamp: creationDate.getTime(), // Use sanitized timestamp
        createdAt: creationDate, // Fix Timestamp
        participant: message.participant,
        dataJson: message, // Store full payload including urlPreview and pushName
        quotedMsgId: message.quotedMsgId,
        ack: message.status || message.ack || 0,
        tenantId
    };
    // If this is an existing sent message, we should not revert the ACK if it is already higher
    if (message.fromMe) {
        const currentMsg = yield Message_1.default.findByPk(message.id);
        if (currentMsg && currentMsg.ack > msgData.ack) {
            msgData.ack = currentMsg.ack;
        }
    }
    // Logic to handle media that arrived from Engine (Microservice)
    // Only process new media if we don't have a preserved one
    if (message.hasMedia && message.mediaData && !preservedMediaUrl) {
        try {
            const { join } = require("path");
            const { writeFile } = require("fs").promises;
            const uploadConfig = require("../../config/upload").default;
            // Deduce extension
            const mimetype = message.mimetype || "";
            const ext = ((_b = mimetype.split("/")[1]) === null || _b === void 0 ? void 0 : _b.split(";")[0]) || "bin";
            const filename = `${new Date().getTime()}-${message.id}.${ext}`;
            const tenantFolder = join(uploadConfig.directory, tenantId.toString());
            if (!require("fs").existsSync(tenantFolder)) {
                require("fs").mkdirSync(tenantFolder, { recursive: true });
            }
            const filePath = join(tenantFolder, filename);
            const buffer = Buffer.from(message.mediaData, "base64");
            yield writeFile(filePath, buffer);
            msgData.mediaUrl = `${tenantId}/${filename}`;
            // Fix mediaType to be more specific if Engine sent "media"
            if (message.type === "media") {
                if (mimetype.startsWith("image/"))
                    msgData.mediaType = "image";
                else if (mimetype.startsWith("video/"))
                    msgData.mediaType = "video";
                else if (mimetype.startsWith("audio/"))
                    msgData.mediaType = "audio";
                else
                    msgData.mediaType = "document";
            }
        }
        catch (err) {
            logger_1.logger.error(`Error saving media for message ${message.id}: ${err}`);
            // Fallback: Don't block message creation, but it will lack media
        }
    }
    yield (0, CreateMessageService_1.default)({ messageData: msgData });
});
// Helper function for Poll Barrier
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
            // Note: pushName is already merged into 'name' by CreateOrUpdateContactService logic
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
const handleMessageReaction = (payload, tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messageId, reaction, sender, timestamp, sessionId } = payload;
        if (!tenantId && sessionId) {
            const whatsapp = yield Whatsapp_1.default.findByPk(getSessionId(sessionId));
            if (whatsapp) {
                tenantId = whatsapp.tenantId;
            }
        }
        logger_1.logger.info(`[EventListener] Received reaction for message ${messageId}: ${reaction} from ${sender}`);
        const message = yield Message_1.default.findOne({
            where: { id: messageId, tenantId }
        });
        if (!message) {
            logger_1.logger.warn(`[EventListener] Message ${messageId} not found for reaction update.`);
            return;
        }
        // Update reactions JSON
        // Structure: [{ sender: string, text: string, timestamp: number }]
        let currentReactions = message.reactions || [];
        // Remove previous reaction from this sender if exists
        currentReactions = currentReactions.filter(r => r.sender !== sender);
        // If reaction is not empty, add new one
        // WhatsApp sends empty string when removing a reaction
        if (reaction) {
            currentReactions.push({
                sender,
                text: reaction,
                timestamp
            });
        }
        yield message.update({ reactions: currentReactions });
        // Emit via Socket.IO
        const io = (0, socket_1.getIO)();
        io.to(message.ticketId.toString()).emit(`appMessage`, {
            action: "update",
            message: message
        });
    }
    catch (err) {
        logger_1.logger.error(`[EventListener] Error handling message reaction: ${err}`);
    }
});
const handleMessageAck = (payload, tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messageId, ack, sessionId } = payload;
        if (!tenantId && sessionId) {
            const whatsapp = yield Whatsapp_1.default.findByPk(getSessionId(sessionId));
            if (whatsapp) {
                tenantId = whatsapp.tenantId;
            }
        }
        logger_1.logger.info(`[EventListener] handleMessageAck: Processing ACK ${ack} for msg ${messageId}`);
        // Simple retry logic for race condition (ACK before Message Creation)
        // Try up to 10 times with 500ms delay (5 seconds total)
        let message = null;
        for (let i = 0; i < 10; i++) {
            message = yield Message_1.default.findOne({
                where: { id: messageId, tenantId }
            });
            if (message)
                break;
            if (i === 0)
                logger_1.logger.info(`[EventListener] Message ${messageId} not found for ACK update. Starting retries...`);
            yield new Promise(r => setTimeout(r, 500));
        }
        if (!message) {
            logger_1.logger.warn(`[EventListener] Message ${messageId} not found after retries. ACK ${ack} lost.`);
            return;
        }
        // Only update if new ACK is higher than current to prevent regression
        if (ack > message.ack) {
            yield message.update({ ack });
            const io = (0, socket_1.getIO)();
            io.to(message.ticketId.toString()).emit(`appMessage`, {
                action: "update",
                message: message
            });
        }
    }
    catch (err) {
        logger_1.logger.error(`[EventListener] Error handling message ACK: ${err}`);
    }
});
const handleMessageRevoke = (payload, tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messageId, sessionId, participant } = payload;
        if (!tenantId && sessionId) {
            const whatsapp = yield Whatsapp_1.default.findByPk(getSessionId(sessionId));
            if (whatsapp) {
                tenantId = whatsapp.tenantId;
            }
        }
        logger_1.logger.info(`[EventListener] handleMessageRevoke: Revoking msg ${messageId} (by ${participant})`);
        const message = yield Message_1.default.findOne({
            where: { id: messageId, tenantId }
        });
        if (!message) {
            logger_1.logger.warn(`[EventListener] Message ${messageId} not found for revocation.`);
            return;
        }
        // Update isDeleted and store deleter info in dataJson
        // We preserve the original body in the DB, but frontend must know it's deleted.
        const currentDataJson = message.dataJson || {};
        yield message.update({
            isDeleted: true,
            dataJson: Object.assign(Object.assign({}, currentDataJson), { deletedBy: participant })
        });
        const io = (0, socket_1.getIO)();
        io.to(message.ticketId.toString()).emit(`appMessage`, {
            action: "update",
            message: message
        });
    }
    catch (err) {
        logger_1.logger.error(`[EventListener] Error handling message revocation: ${err}`);
    }
});
