import Whatsapp from "../../models/Whatsapp";
import RabbitMQService from "../RabbitMQService";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../utils/logger";

const GetProfilePicUrl = async (number: string, tenantId: number | string = 1): Promise<string> => {
  try {
    const whatsapp = await Whatsapp.findOne({
      where: { status: "CONNECTED", tenantId }
    });

    if (whatsapp) {
      await RabbitMQService.publishCommand("wbot.global.contact.sync", {
        id: uuidv4(),
        timestamp: Date.now(),
        type: "contact.sync",
        payload: {
          sessionId: whatsapp.id,
          number: number,
          contactId: 0 // We don't have ID yet, but we want the engine to fetch and emit update
        },
        tenantId
      });
      logger.info(`[GetProfilePicUrl] Scheduled sync for ${number}`);
    }
  } catch (err) {
    logger.error(`[GetProfilePicUrl] Error scheduling sync: ${err}`);
  }
  return ""; // Return empty for now, it will be updated asynchronously via RabbitMQ event
};

export default GetProfilePicUrl;
