
import { Envelope } from "../../microservice/contracts";
import RabbitMQService from "../RabbitMQService";
import { logger } from "../../utils/logger";
import EnrichContactService from "../ContactServices/EnrichContactService";

interface ContactSyncPayload {
    contactId: number;
}

export const CommandListener = async () => {
    const routingKeys = [
        "wbot.*.contact.sync"
    ];

    await RabbitMQService.consumeCommands("api.commands.process", routingKeys, async (msg: Envelope) => {
        logger.info(`Command received: ${msg.type}`);

        switch (msg.type) {
            case "contact.sync":
                await handleContactSync(msg.payload as ContactSyncPayload);
                break;
            default:
                logger.warn(`Unknown command type: ${msg.type}`);
        }
    });
};

const handleContactSync = async (payload: ContactSyncPayload) => {
    logger.info(`Executing contact sync for ID: ${payload.contactId}`);
    try {
        await EnrichContactService({ contactId: payload.contactId });
    } catch (error) {
        logger.error(`Failed to sync contact ${payload.contactId}: ${error}`);
    }
};
