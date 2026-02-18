"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Contact_1 = __importDefault(require("../../models/Contact"));
const RabbitMQService_1 = __importDefault(require("../RabbitMQService"));
const sequelize_1 = require("sequelize");
const logger_1 = require("../../utils/logger");
const uuid_1 = require("uuid");
const BatchEnrichContactsService = async (tenantId) => {
    let count = 0;
    try {
        // 1. Find candidates:
        // - Must verify IS NOT A GROUP
        // - Criteria for incomplete:
        //   a) LID is missing (null)
        //   b) OR Number equals LID (meaning it was created via LID-only flow and hasn't been resolved to a number yet - rare in this codebase but possible)
        //   c) OR RemoteJid contains '@lid' (not used in this codebase typically, but safe to ignore)
        // We stick to: LID is NULL and Number is NOT NULL.
        const contacts = await Contact_1.default.findAll({
            where: {
                tenantId,
                isGroup: false,
                [sequelize_1.Op.or]: [
                    { lid: null },
                    // Sequelize.where(Sequelize.col("number"), "=", Sequelize.col("lid")) // Safe to add? usually LID != Number
                ],
                number: { [sequelize_1.Op.ne]: null }, // Must have a number to query
            },
            attributes: ["id", "name", "number", "lid"],
            limit: 1000 // Batch limit to avoid overload
        });
        logger_1.logger.info(`[BatchEnrich] Found ${contacts.length} candidates for enrichment for tenant ${tenantId}.`);
        for (const contact of contacts) {
            if (!contact.number)
                continue;
            try {
                await RabbitMQService_1.default.publishCommand("wbot.global.contact.sync", {
                    id: (0, uuid_1.v4)(),
                    timestamp: Date.now(),
                    type: "contact.sync",
                    payload: {
                        contactId: contact.id,
                        number: contact.number,
                        lid: undefined, // ensure we ask for it
                        sessionId: 1 // TODO: Need specific sessionId logic. Ideally 0 for "any"
                    },
                    tenantId
                });
                count++;
                // Small delay if needed? RabbitMQ handles it, but maybe Engine overload?
                // Let's trust RabbitMQ.
            }
            catch (e) {
                logger_1.logger.error(`Failed to enqueue enrich for contact ${contact.id}: ${e}`);
            }
        }
        logger_1.logger.info(`[BatchEnrich] Enqueued ${count} contacts.`);
        return { count };
    }
    catch (err) {
        logger_1.logger.error(`[BatchEnrich] Error: ${err}`);
        throw new Error("ERR_BATCH_ENRICH_CONTACTS");
    }
};
exports.default = BatchEnrichContactsService;
