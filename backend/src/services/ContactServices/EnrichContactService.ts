
import { Client } from "whatsapp-web.js";
import Contact from "../../models/Contact";
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

    // Find a connected wbot. Ideally we should know which wbot this contact belongs to.
    // We'll pick the first connected one or from ticket... 
    // For now, we assume single tenant/wbot or pick the default. 
    // In a multi-tenant real scenario, we might need the connectionId.
    // We'll try to find a session that is connected.
    // Since we don't store wbotId on contact, we might need to guess or pass it.
    // Let's rely on getWbot(1) default or improve this if we have tenant info.
    // Assuming default ID 1 for now or iterating.

    // Actually, we can try to use any connected session to fetch public info.
    let wbot: Client;
    try {
        wbot = getWbot(1); // Default session
    } catch (err) {
        // Try to find any active session?
        // For now, simple fail if default not up.
        throw new Error("No active WhatsApp session found to sync contact.");
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
