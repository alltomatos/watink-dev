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
const CreateOrUpdateContactService_1 = require("./CreateOrUpdateContactService");
const CreateContactService = async ({ name, number, email = "", extraInfo = [], tenantId, waitEnrichment = false // Default false to maintain backward compat unless requested
 }) => {
    if (!tenantId) {
        throw new AppError_1.default("Tenant ID is required for creating a contact.", 403);
    }
    const numberExists = await Contact_1.default.findOne({
        where: { number, tenantId }
    });
    if (numberExists) {
        throw new AppError_1.default("ERR_DUPLICATED_CONTACT");
    }
    const contact = await Contact_1.default.create({
        name,
        number,
        email,
        extraInfo,
        tenantId
    }, {
        include: ["extraInfo"]
    });
    try {
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
            logger_1.logger.info(`[CreateContactService] Sent contact.sync command for contact ${contact.id}`);
            // BARRIER LOGIC
            if (waitEnrichment) {
                // Check if we need to wait (if name is raw number and no pfp)
                // Actually, a newly created contact here ALWAYS likely needs enrichment unless user provided heavy data.
                // But even if user provided data, we might want to sync with WhatsApp to get real PFP.
                // We wait if asked.
                await (0, CreateOrUpdateContactService_1.waitForContactEnrichment)(contact.id, false, tenantId); // isGroup false for now as this service seems to be for manual scalar contacts?
                // To be safe, manual contacts are usually individuals. If groups are allowed here, we need to check isGroup from body?
                // Contact model has default isGroup=false.
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
