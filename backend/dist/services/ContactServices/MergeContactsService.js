"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Contact_1 = __importDefault(require("../../models/Contact"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Message_1 = __importDefault(require("../../models/Message"));
const logger_1 = require("../../utils/logger");
const MergeContactsService = async ({ contactIdOrigin, contactIdTarget, tenantId }) => {
    const contactOrigin = await Contact_1.default.findOne({
        where: { id: contactIdOrigin, tenantId }
    });
    const contactTarget = await Contact_1.default.findOne({
        where: { id: contactIdTarget, tenantId }
    });
    if (!contactOrigin || !contactTarget) {
        throw new Error("ERR_CONTACT_NOT_FOUND_FOR_MERGE");
    }
    // 1. Update Tickets
    await Ticket_1.default.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId } });
    // 2. Update Messages
    await Message_1.default.update({ contactId: contactIdTarget }, { where: { contactId: contactIdOrigin, tenantId } });
    // 3. Merge Data (Prioritize Target, fill with Origin if missing)
    const updates = {};
    if (!contactTarget.email && contactOrigin.email)
        updates.email = contactOrigin.email;
    if (!contactTarget.name && contactOrigin.name)
        updates.name = contactOrigin.name;
    if (!contactTarget.number && contactOrigin.number)
        updates.number = contactOrigin.number;
    // if (!contactTarget.profilePicUrl && contactOrigin.profilePicUrl) updates.profilePicUrl = contactOrigin.profilePicUrl; 
    if (Object.keys(updates).length > 0) {
        await contactTarget.update(updates);
    }
    // 4. Delete Origin
    await contactOrigin.destroy();
    logger_1.logger.info(`Merged contact ${contactIdOrigin} into ${contactIdTarget}`);
    return contactTarget;
};
exports.default = MergeContactsService;
