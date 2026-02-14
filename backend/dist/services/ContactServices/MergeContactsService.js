"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../../database"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Message_1 = __importDefault(require("../../models/Message"));
const ContactCustomField_1 = __importDefault(require("../../models/ContactCustomField"));
const EntityTag_1 = __importDefault(require("../../models/EntityTag"));
const ClientContact_1 = __importDefault(require("../../models/ClientContact"));
const Deal_1 = __importDefault(require("../../models/Deal"));
const Protocol_1 = __importDefault(require("../../models/Protocol"));
const ConversationEmbedding_1 = __importDefault(require("../../models/ConversationEmbedding"));
const WhatsAppGroup_1 = __importDefault(require("../../models/WhatsAppGroup"));
const logger_1 = require("../../utils/logger");
const chooseBetterName = (target, origin, targetNumber, originNumber) => {
    const isPlaceholder = (value, number) => {
        if (!value)
            return true;
        const normalized = value.trim().toLowerCase();
        if (!normalized)
            return true;
        if (number && normalized === String(number).trim().toLowerCase())
            return true;
        return normalized.includes("@s.whatsapp.net") || normalized.includes("@c.us") || normalized.includes("@lid") || /^\d+$/.test(normalized);
    };
    if (isPlaceholder(target, targetNumber) && origin && !isPlaceholder(origin, originNumber)) {
        return origin;
    }
    return target || origin;
};
const mergeContactsTx = async ({ contactIdOrigin, contactIdTarget, tenantId, transaction }) => {
    if (contactIdOrigin === contactIdTarget) {
        const same = await Contact_1.default.findOne({ where: { id: contactIdTarget, tenantId }, transaction });
        if (!same)
            throw new Error("ERR_CONTACT_NOT_FOUND_FOR_MERGE");
        return same;
    }
    const [contactOrigin, contactTarget] = await Promise.all([
        Contact_1.default.findOne({ where: { id: contactIdOrigin, tenantId }, transaction }),
        Contact_1.default.findOne({ where: { id: contactIdTarget, tenantId }, transaction })
    ]);
    if (!contactOrigin || !contactTarget) {
        throw new Error("ERR_CONTACT_NOT_FOUND_FOR_MERGE");
    }
    // Reatribuir vínculos principais
    await Promise.all([
        Ticket_1.default.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
        Message_1.default.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
        Deal_1.default.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
        Protocol_1.default.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
        ConversationEmbedding_1.default.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
        WhatsAppGroup_1.default.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId }, transaction }),
        ClientContact_1.default.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin }, transaction }),
    ]);
    // Mesclar extraInfo sem duplicar name+value
    const originExtraInfo = await ContactCustomField_1.default.findAll({ where: { contactId: contactIdOrigin }, transaction });
    const targetExtraInfo = await ContactCustomField_1.default.findAll({ where: { contactId: contactIdTarget }, transaction });
    const targetInfoKeys = new Set(targetExtraInfo.map(i => `${i.name}::${i.value}`));
    for (const info of originExtraInfo) {
        const key = `${info.name}::${info.value}`;
        if (!targetInfoKeys.has(key)) {
            await ContactCustomField_1.default.create({ name: info.name, value: info.value, contactId: contactIdTarget }, { transaction });
        }
    }
    // Mesclar tags (EntityTags)
    const originTags = await EntityTag_1.default.findAll({
        where: { entityType: "contact", entityId: contactIdOrigin },
        transaction
    });
    for (const tag of originTags) {
        const exists = await EntityTag_1.default.findOne({
            where: { entityType: "contact", entityId: contactIdTarget, tagId: tag.tagId },
            transaction
        });
        if (!exists) {
            await EntityTag_1.default.create({
                tagId: tag.tagId,
                entityType: "contact",
                entityId: contactIdTarget,
                createdBy: tag.createdBy
            }, { transaction });
        }
    }
    const updates = {
        name: chooseBetterName(contactTarget.name, contactOrigin.name, contactTarget.number, contactOrigin.number),
        email: contactTarget.email || contactOrigin.email,
        number: contactTarget.number || contactOrigin.number,
        lid: contactTarget.lid || contactOrigin.lid,
        profilePicUrl: contactTarget.profilePicUrl || contactOrigin.profilePicUrl,
        isGroup: contactTarget.isGroup || contactOrigin.isGroup,
        walletUserId: contactTarget.walletUserId || contactOrigin.walletUserId
    };
    await contactTarget.update(updates, { transaction });
    // Limpeza de registros dependentes já copiados
    await Promise.all([
        ContactCustomField_1.default.destroy({ where: { contactId: contactIdOrigin }, transaction }),
        EntityTag_1.default.destroy({ where: { entityType: "contact", entityId: contactIdOrigin }, transaction })
    ]);
    await contactOrigin.destroy({ transaction });
    logger_1.logger.info(`[MergeContactsService] Merged contact ${contactIdOrigin} into ${contactIdTarget} (tenant ${tenantId})`);
    await contactTarget.reload({ transaction });
    return contactTarget;
};
const MergeContactsService = async (params) => {
    if (params.transaction) {
        return mergeContactsTx(params);
    }
    return database_1.default.transaction(async (transaction) => {
        return mergeContactsTx({ ...params, transaction });
    });
};
exports.default = MergeContactsService;
