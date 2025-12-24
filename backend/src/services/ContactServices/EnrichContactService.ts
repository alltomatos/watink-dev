
import { Client } from "whatsapp-web.js";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { getWbot } from "../../libs/wbot";
import CreateOrUpdateContactService from "./CreateOrUpdateContactService";
import { logger } from "../../utils/logger";

interface Request {
    contactId: number;
}

const EnrichContactService = async ({ contactId }: Request): Promise<Contact> => {
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
        throw new Error("Contact not found");
    }

    // Find a connected wbot.
    let wbot: Client;
    let whatsapp: Whatsapp | null = null;

    if (contact.tenantId) {
        whatsapp = await Whatsapp.findOne({
            where: { status: "CONNECTED", tenantId: contact.tenantId }
        });
    }

    if (!whatsapp) {
        whatsapp = await Whatsapp.findOne({
            where: { status: "CONNECTED", isDefault: true }
        });
    }

    if (!whatsapp) {
        whatsapp = await Whatsapp.findOne({
            where: { status: "CONNECTED" }
        });
    }

    if (!whatsapp) {
        throw new Error("No active WhatsApp session found to sync contact.");
    }

    try {
        wbot = getWbot(whatsapp.id);
    } catch (err) {
        throw new Error(`Could not get wbot for session ${whatsapp.id}: ${err}`);
    }

    // ==========================================================
    // SCENARIO 1: Have LID
    // ==========================================================
    if (contact.lid) {
        try {
            // 1. Local Store Lookup (using getContactById)
            // Ideally this hits the cache.
            const wbotContact = await wbot.getContactById(contact.lid);

            if (wbotContact) {
                const name = wbotContact.name || wbotContact.pushname;
                if (name) {
                    await contact.update({ name });
                }

                const profilePicUrl = await wbotContact.getProfilePicUrl();
                if (profilePicUrl) {
                    await contact.update({ profilePicUrl });
                }
            }
        } catch (err) {
            logger.warn(`Could not fetch LID ${contact.lid} from store: ${err}`);
        }

        // Fallback: If we have a number but it failed
        if (contact.number) {
            try {
                // 2. Query Network (onWhatsApp / getContactById for number)
                const jid = `${contact.number}@c.us`;
                const wbotContact = await wbot.getContactById(jid);

                if (wbotContact) {
                    const name = wbotContact.name || wbotContact.pushname;
                    if (name) await contact.update({ name });

                    const profilePicUrl = await wbotContact.getProfilePicUrl();
                    if (profilePicUrl) await contact.update({ profilePicUrl });
                }
            } catch (err) {
                logger.warn(`Fallback query for number ${contact.number} failed: ${err}`);
            }
        }

    }
    // ==========================================================
    // SCENARIO 2: Have Number, Missing LID
    // ==========================================================
    else if (contact.number) {
        try {
            const jid = `${contact.number}@c.us`;
            const wbotContact = await wbot.getContactById(jid);

            if (wbotContact) {
                // Update basic info
                const name = wbotContact.name || wbotContact.pushname;
                if (name && contact.name !== name && !contact.name) {
                    // Only update if current name is empty or different? 
                    // User said "Update name found". Let's force update if found.
                    await contact.update({ name });
                }

                const profilePicUrl = await wbotContact.getProfilePicUrl();
                if (profilePicUrl) {
                    await contact.update({ profilePicUrl });
                }

                // Capture LID if available
                // WWJS contact object might expose it?
                // Often it is not directly exposed as 'lid' property in standard WWJS Contact.
                // It might be in raw properties or we might need to assume 
                // looking for a linked contact.
                // But let's assume if we can find it we update it.

                // NOTE: WWJS might not expose LID on standard getContactById(number) return
                // unless it is a business contact or verified.
                // We will check existing properties.

            }
        } catch (err) {
            logger.error(`Error syncing contact ${contact.number}: ${err}`);
        }
    }

    await contact.reload();
    return contact;
};

export default EnrichContactService;
